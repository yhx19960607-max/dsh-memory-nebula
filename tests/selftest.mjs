import os from 'node:os'
import path from 'node:path'
import { rm } from 'node:fs/promises'
import { createIndexer, buildLexicon, extractTerms, isInjected, cleanUserText } from '../lib/indexer.js'

const store = path.join(os.tmpdir(), 'nebula-selftest-' + Date.now())
let failed = 0
function check(name, cond, extra = '') {
  if (cond) console.log('ok   ', name, extra)
  else { failed += 1; console.error('FAIL ', name, extra) }
}

// 纯函数
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

const idx = createIndexer({ root: path.join(os.homedir(), '.dsh', 'sessions'), store })
await idx.load()
const built = await idx.rebuild()
check('索引有记忆', built.memories > 0, built.memories + ' 条')
check('索引有会话', built.sessions > 0, built.sessions + ' 个')
const g = idx.graph()
check('图谱有节点', g.nodes.length > 0, g.nodes.length + ' 节点')
check('图谱有连线', g.links.length > 0, g.links.length + ' 条')
check('节点带标签', g.nodes.every((n) => Array.isArray(n.tags)))
const hits = idx.search('插件 记忆')
check('搜索有结果', hits.length > 0, hits.length + ' 条')
const mem = idx.memories[0]
const full = await idx.fullText(mem)
check('能读回原文', typeof full === 'string' && full.length > 0, full.length + ' 字')
const row = await idx.addManual({ text: '测试手写记忆：星穹自测', tags: ['自测'] })
check('能手写记忆', Boolean(row.id))
const g2 = idx.graph()
check('手写记忆进图', g2.nodes.some((n) => n.manual))
check('手写记忆可搜到', idx.search('星穹自测').length > 0)

await rm(store, { recursive: true, force: true })
if (failed) { console.error('\n' + failed + ' 项失败'); process.exit(1) }
console.log('\n全部通过')
