import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import {
  createIndexer,
  buildLexicon,
  extractTerms,
  isInjected,
  cleanUserText,
} from '../lib/indexer.js'

const store = path.join(os.tmpdir(), 'nebula-selftest-' + Date.now())
const sessionsRoot = path.join(store, 'sessions')
let failed = 0

function check(name, cond, extra = '') {
  if (cond) console.log('ok   ', name, extra)
  else { failed += 1; console.error('FAIL ', name, extra) }
}

/* ------------------------------------------------------------ 纯函数 ---- */

check('注入过滤：渠道', isInjected('[渠道：微信] 你在和用户对话'))
check('注入过滤：人设', isInjected('【人设:请始终按这个人设说话】人设：鲸鱼娘'))
check('正常消息不算注入', !isInjected('帮我看下这个 bug'))
check('剥渠道尾巴', cleanUserText('把录屏发过来 [渠道：微信] 你在和用户对话') === '把录屏发过来')

const lex = buildLexicon([
  '我想做一个可视化记忆插件，插件要好用一点',
  '这个插件的做法值得参考，插件市场里也见过',
  '安装插件之后要重启，插件才会生效',
  '插件列表里有很多插件，插件详情能点开看',
])
check('词典能认出「插件」', lex.has('插件'), [...lex].slice(0, 5).join(','))
check('词提取带标签', extractTerms('插件的星图做法', lex).has('插件'))

/* -------------------------------------------------------------- 夹具 ---- */

const T0 = Date.UTC(2026, 0, 2, 3, 0, 0)

function eventsOf(sid, cwd, msgs) {
  const rows = [{ type: 'session', version: 4, id: sid, cwd, createdAt: T0 }]
  msgs.forEach((m, i) => {
    if (m[0] === 'u') {
      rows.push({ type: 'user/message', seq: i + 1, time: T0 + i * 60000, data: { source: { kind: 'user' }, content: [{ type: 'text', text: m[1] }] } })
    } else {
      rows.push({ type: 'assistant/message', seq: i + 1, time: T0 + i * 60000, data: { message: { content: [{ type: 'text', text: m[1] }] } } })
    }
  })
  return rows
}

async function writeSession(ws, sid, msgs, extra = []) {
  const dir = path.join(sessionsRoot, ws, sid)
  await mkdir(dir, { recursive: true })
  const rows = [...eventsOf(sid, '/ws/' + ws, msgs), ...extra]
  const buf = Buffer.from(rows.map((r) => JSON.stringify(r)).join('\n'))
  await writeFile(path.join(dir, 'session.v4.jsonl.zstd'), zlib.zstdCompressSync(buf))
}

await writeSession('alpha', 'session-a', [
  ['u', '记住：以后都用中文回答我'],
  ['a', '好的，以后默认用中文回复你。'],
  ['u', '帮我把这个项目整理成插件'],
  ['a', '可以，先建 package.json，再写 cordis.patch.yml。'],
])
await writeSession('alpha', 'session-b', [
  ['u', '山西旅行六天五晚 1580 划算吗'],
  ['a', '先看包含哪些门票和住宿，再比价。'],
])
await writeSession('beta', 'session-c', [
  ['u', '把这段代码压缩一下'],
  ['a', '用 stream 逐块处理，内存占用会小很多。'],
  ['u', '[渠道：微信] 你在和微信用户对话'],
], [
  { type: 'user/message', seq: 99, time: T0 + 900000, data: { source: { kind: 'tool' }, content: [{ type: 'text', text: '工具调用的输出不算记忆' }] } },
])

/* -------------------------------------------------------------- 索引 ---- */

const idx = createIndexer({ root: sessionsRoot, store })
await idx.load()
const built = await idx.rebuild()
check('索引有记忆', built.memories >= 4, built.memories + ' 条')
check('跳过注入与工具消息', built.memories === 4, '应为 4 条（注入与工具消息都跳过）')
check('索引有会话', built.sessions === 3, built.sessions + ' 个')

const all = idx.graph({})
check('图谱有节点', all.nodes.length === 4, all.nodes.length + ' 节点')
check('工作区列表', all.workspaces.length === 2, all.workspaces.map((w) => w.name).join(','))
check('连线结构', Array.isArray(all.links))

const alpha = idx.graph({ workspaces: ['/ws/alpha'] })
check('按工作区过滤', alpha.stats.sessions === 2 && alpha.stats.memories === 3, JSON.stringify(alpha.stats))
check('过滤后工作区列表仍全量', alpha.workspaces.length === 2)

const limited = idx.graph({ limit: 2 })
check('limit 严格生效', limited.stats.shown === 2, String(limited.stats.shown))
check('limit=0 表示不限', idx.graph({ limit: 0 }).stats.shown === 4)

const hits = idx.search('中文')
check('搜索命中', hits.length >= 1, hits.length + ' 条')
check('搜索结果带 id 与 sid', Boolean(hits[0] && hits[0].id && hits[0].sid))

const target = idx.memories.find((m) => m.user.includes('插件'))
const full = await idx.fullText(target)
check('能读回原文', full.includes('cordis.patch.yml'), full.length + ' 字')
check('原文可拆成对话', /【[^】]*】用户：/.test(full))

const row = await idx.addManual({ text: '测试手写记忆：星穹自测', tags: ['自测'] })
check('能手写记忆', Boolean(row.id))
check('手写记忆进图', idx.graph({}).nodes.some((n) => n.manual))
check('手写记忆可搜到', idx.search('星穹自测').length > 0)

// 持久化：新开一个实例读回 manual
const idx2 = createIndexer({ root: sessionsRoot, store })
await idx2.load()
await idx2.rebuild()
check('手写记忆落盘', idx2.graph({}).nodes.some((n) => n.manual))
const manualRaw = JSON.parse(await readFile(path.join(store, 'manual.json'), 'utf8'))
check('manual.json 结构', Array.isArray(manualRaw) && manualRaw.length === 1)

/* --------------------------------------------------- 真实数据 smoke ---- */

try {
  const real = createIndexer({
    root: path.join(os.homedir(), '.dsh', 'sessions'),
    store: path.join(store, 'real-cache'),
  })
  await real.load()
  const r = await real.rebuild()
  check('真实会话 smoke', r.memories >= 0, r.memories + ' 条 / ' + r.sessions + ' 会话')
} catch (err) {
  console.log('skip  真实会话 smoke（读不到 ~/.dsh/sessions）：', String(err.message || err))
}

await rm(store, { recursive: true, force: true })
if (failed) { console.error('\n' + failed + ' 项失败'); process.exit(1) }
console.log('\n全部通过')
