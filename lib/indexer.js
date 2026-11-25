/**
 * 记忆索引：会话 → 一条条"记忆回合" → 标签、重要度、图谱、检索。
 * 纯本地：只读 ~/.dsh/sessions，缓存写 ~/.dsh/memory-nebula/。
 */
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  collectTurns,
  dayKey,
  findSessionFiles,
  idOf,
  readSessionEvents,
  readSessionHead,
  titleOf,
} from './transcript.js'

export const VERSION = 4
export const CACHE_LIMIT = 2200

const CJK = /[\u4e00-\u9fff]/

const STOP_BI = new Set([
  '我们', '你们', '他们', '这个', '那个', '这些', '那些', '什么', '怎么', '可以', '就是', '然后',
  '因为', '所以', '但是', '如果', '没有', '一个', '现在', '已经', '还是', '应该', '觉得', '需要',
  '可能', '时候', '不是', '自己', '知道', '这样', '问题', '一下', '开始', '之后', '以及', '或者',
  '其中', '大家', '这里', '那里', '帮我', '我要', '你的', '我的', '是的', '好的', '有点', '一些',
  '这种', '那种', '其实', '不过', '而且', '并且', '的话', '来看', '看看', '第一', '第二', '最后',
  '目前', '之前', '以后', '今天', '内容', '东西', '事情', '方面', '地方', '时间', '部分', '情况',
  '结果', '直接', '不要', '只有', '个人', '确认', '不能', '输出', '要求', '名字', '上面', '上的',
  '的人', '一条', '只要', '而是', '同时', '那样', '那么', '为何', '如何', '怎样', '是否', '能否',
  '不会', '有些', '很多', '非常', '比较', '等等', '之类', '一次', '结论', '命令', '用户', '里的',
  '群里', '需要', '执行', '系统', '回复', '东西', '一条', '现在', '一下', '只有', '不到',
])


const STOP_EN = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has', 'are', 'was', 'were', 'you',
  'your', 'not', 'but', 'can', 'will', 'would', 'should', 'could', 'there', 'their', 'what', 'when',
  'then', 'than', 'into', 'out', 'about', 'just', 'like', 'get', 'got', 'one', 'two', 'use', 'used',
  'using', 'also', 'some', 'any', 'all', 'more', 'most', 'very', 'make', 'made', 'see', 'how', 'why',
  'its', 'it', 'is', 'to', 'of', 'in', 'on', 'at', 'as', 'be', 'or', 'if', 'we', 'he', 'she', 'they',
])

/** 候选词：英文词 + 中文 bigram（必须通过词边界词典）。 */
export function extractTerms(text, lexicon = null) {
  const counts = new Map()
  const src = String(text || '')
  for (const m of src.matchAll(/[A-Za-z][A-Za-z0-9_+#.-]{2,}/g)) {
    const w = m[0].toLowerCase()
    if (STOP_EN.has(w) || w.length > 24) continue
    counts.set(w, (counts.get(w) || 0) + 1)
  }
  const runs = src.split(/[^\u4e00-\u9fff]+/)
  for (const run of runs) {
    if (!run || run.length < 2) continue
    for (let i = 0; i + 2 <= run.length; i += 1) {
      const bi = run.slice(i, i + 2)
      if (STOP_BI.has(bi)) continue
      if (lexicon && !lexicon.has(bi)) continue
      counts.set(bi, (counts.get(bi) || 0) + 1)
    }
  }
  return counts
}

/**
 * 词边界发现：两字组合的左右邻接字越分散，越像一个独立的词。
 * "插件" 左右见过各种字；"序员" 几乎总是接在 "程" 后面，会被淘汰。
 */
export function buildLexicon(texts) {
  const count = new Map()
  const left = new Map()
  const right = new Map()
  const bump = (map, key, ch) => {
    if (!map.has(key)) map.set(key, new Map())
    const m = map.get(key)
    m.set(ch, (m.get(ch) || 0) + 1)
  }
  for (const text of texts) {
    for (const run of String(text || '').split(/[^\u4e00-\u9fff]+/)) {
      if (!run) continue
      for (let i = 0; i + 2 <= run.length; i += 1) {
        const bi = run.slice(i, i + 2)
        count.set(bi, (count.get(bi) || 0) + 1)
        bump(left, bi, i === 0 ? '#' : run[i - 1])
        bump(right, bi, i + 2 >= run.length ? '#' : run[i + 2])
      }
    }
  }
  const entropy = (m) => {
    let total = 0
    for (const c of m.values()) total += c
    if (!total) return 0
    let h = 0
    for (const c of m.values()) { const p = c / total; h -= p * Math.log2(p) }
    return h
  }
  const lexicon = new Set()
  for (const [bi, n] of count) {
    if (n < 2) continue
    if (STOP_BI.has(bi)) continue
    if (entropy(left.get(bi)) < 1 && entropy(right.get(bi)) < 1) continue
    if (entropy(left.get(bi)) < 0.9 || entropy(right.get(bi)) < 0.9) continue
    lexicon.add(bi)
  }
  return lexicon
}

/** 明显是系统注入、不是真人说话的片段。 */
export function isInjected(text) {
  const t = String(text || '').trim()
  if (!t) return true
  if (/^\[(桥接注入|系统|System|system|dsb-mnemon|dsh-|Tool)/.test(t)) return true
  if (/^【人设/.test(t)) return true
  if (/^\[渠道：/.test(t)) return true
  if (/桥接注入|你的回复会作为.*消息直接发到/.test(t.slice(0, 120))) return true
  if (/^<(system|context|instructions)/i.test(t)) return true
  return false
}

/** 规则打分：偏好/决定类发言更亮。 */
export function scoreImportance(userText, assistantText) {
  const u = String(userText || '')
  let score = 0.28
  if (/记住|以后|每次|长期|偏好|喜欢|讨厌|不要|别用|必须|一定|决定|约定|规范|规则|默认/.test(u)) score += 0.24
  if (/[?？]/.test(u)) score += 0.05
  if (u.length > 220) score += 0.08
  if (/^(\/|帮我|请|我们)/.test(u)) score += 0.03
  if ((assistantText || '').length > 400) score += 0.04
  return Math.max(0.12, Math.min(1, score))
}

/** 剥掉混进真人发言里的渠道 / 桥接注入尾巴。 */
export function cleanUserText(text) {
  let s = String(text || '')
  for (const marker of ['[渠道：', '[桥接注入', '[系统注入']) {
    const at = s.indexOf(marker)
    if (at > 0) s = s.slice(0, at)
  }
  return s.replace(/\s+/g, ' ').trim()
}

function shortText(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) : t
}

/** 一条记忆的可读摘要。 */
export function snippetOf(mem, n = 120) {
  const t = String(mem?.user || mem?.text || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

export function createIndexer({ root, store, limit = CACHE_LIMIT, log = () => {} }) {
  const cacheFile = path.join(store, 'cache.json')
  const manualFile = path.join(store, 'manual.json')
  let files = {}       // path -> { mtime, size, ... }
  let memories = []    // 全部记忆
  let sessions = []    // 会话元信息
  let builtAt = 0
  let building = null
  let manual = []
  let lastError = ''

  async function loadCache() {
    try {
      const json = JSON.parse(await readFile(cacheFile, 'utf8'))
      if (json && json.version === VERSION && json.files) files = json.files
    } catch { /* 没有缓存 */ }
    try {
      const json = JSON.parse(await readFile(manualFile, 'utf8'))
      if (Array.isArray(json)) manual = json
    } catch { /* 没有手动记忆 */ }
  }

  async function saveCache() {
    try {
      await mkdir(store, { recursive: true })
      const tmp = cacheFile + '.tmp'
      await writeFile(tmp, JSON.stringify({ version: VERSION, builtAt, files }), 'utf8')
      await rename(tmp, cacheFile)
    } catch (err) { lastError = '写缓存失败：' + String(err?.message || err) }
  }

  /** 解析一个会话文件，返回缓存条目。 */
  async function parseFile(file) {
    const head = await readSessionHead(file)
    const events = await readSessionEvents(file)
    const turns = collectTurns(events)
    const meta = {
      sid: idOf(file),
      cwd: head?.cwd || '',
      createdAt: Number(head?.createdAt) || 0,
      delegationDepth: Number(head?.delegationDepth) || 0,
    }
    const rows = turns.map((t) => ({
      time: t.time,
      user: shortText(cleanUserText(t.user), 2200),
      assistant: shortText(t.assistant, 1600),
      assistantLen: (t.assistant || '').length,
    }))
    return {
      sid: meta.sid,
      cwd: meta.cwd,
      createdAt: meta.createdAt,
      delegationDepth: meta.delegationDepth,
      title: titleOf(turns, { cwd: meta.cwd }),
      turns: rows,
    }
  }

  function buildMemories() {
    const list = []
    const sessionMap = new Map()
    for (const [file, entry] of Object.entries(files)) {
      if (!entry || entry.delegationDepth > 0) continue
      const sid = entry.sid
      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, { id: sid, title: entry.title || '未命名会话', cwd: entry.cwd || '', count: 0, last: 0 })
      }
      const sess = sessionMap.get(sid)
      let prevUser = ''
      entry.turns.forEach((t, i) => {
        const time = Number(t.time) || entry.createdAt || 0
        const user = String(t.user || '').trim()
        if (isInjected(user)) return
        if (user && user === prevUser) return
        prevUser = user
        const mem = {
          id: sid + ':' + i,
          sid,
          idx: i,
          time,
          date: dayKey(time),
          user: t.user || '',
          assistant: t.assistant || '',
          text: (t.user || '') + '\n' + (t.assistant || ''),
          importance: scoreImportance(t.user, t.assistant),
          tags: [],
        }
        list.push(mem)
        sess.count += 1
        sess.last = Math.max(sess.last, time)
      })
    }

    // 手动写入的记忆：单独一个"收藏"星系
    for (const m of manual) {
      if (!m || !m.text) continue
      const sid = 'manual'
      if (!sessionMap.has(sid)) sessionMap.set(sid, { id: sid, title: '手写记忆', cwd: '你亲手点亮的星', count: 0, last: 0 })
      const sess = sessionMap.get(sid)
      const mem = {
        id: 'manual:' + (m.id || Math.random().toString(36).slice(2)),
        sid,
        idx: sess.count,
        time: Number(m.time) || Date.now(),
        date: dayKey(Number(m.time) || Date.now()),
        user: String(m.text),
        assistant: '',
        text: String(m.text),
        importance: Math.max(0.5, Number(m.importance) || 0.9),
        manual: true,
        tags: Array.isArray(m.tags) ? m.tags.slice(0, 8) : [],
      }
      list.push(mem)
      sess.count += 1
      sess.last = Math.max(sess.last, mem.time)
    }

    // 标签：先收集候选，再按全局 IDF 打分取 top 5
    const lexicon = buildLexicon(list.map((m) => m.user + '\n' + m.assistant.slice(0, 800)))
    const df = new Map()
    const candidates = []
    for (const mem of list) {
      if (mem.manual && mem.tags.length) {
        candidates.push(null)
        for (const tag of mem.tags) df.set(tag, (df.get(tag) || 0) + 1)
        continue
      }
      const counts = extractTerms(mem.user + '\n' + mem.assistant.slice(0, 600), lexicon)
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)
      candidates.push(top)
      for (const [term] of top) df.set(term, (df.get(term) || 0) + 1)
    }
    const total = Math.max(1, list.length)
    list.forEach((mem, i) => {
      const top = candidates[i]
      if (!top) return
      const scored = top.map(([term, tf]) => {
        const idf = Math.log(1 + total / (1 + (df.get(term) || 1)))
        return [term, tf * idf * (CJK.test(term) ? 1.15 : 1)]
      }).sort((a, b) => b[1] - a[1])
      const seen = new Set()
      const tags = []
      for (const [term, score] of scored) {
        if (score < 1.1) continue
        if (seen.has(term)) continue
        seen.add(term)
        tags.push(term)
        if (tags.length >= 5) break
      }
      mem.tags = tags
    })

    for (const mem of list) mem.importance = Math.round(mem.importance * 100) / 100
    memories = list
    sessions = [...sessionMap.values()]
  }

  async function rebuild() {
    if (building) return building
    building = (async () => {
      const started = Date.now()
      const found = await findSessionFiles(root)
      const next = {}
      const fresh = []
      for (const file of found) {
        let st
        try { st = await stat(file) } catch { continue }
        const prev = files[file]
        if (prev && prev.mtime === st.mtimeMs && prev.size === st.size) { next[file] = prev; continue }
        fresh.push(file)
      }
      // 新文件/变更文件并发解析（限制并发 4）
      const queue = fresh.slice()
      const workers = new Array(Math.min(4, queue.length || 1)).fill(0).map(async () => {
        while (queue.length) {
          const file = queue.shift()
          try {
            const st = await stat(file)
            const entry = await parseFile(file)
            next[file] = { ...entry, mtime: st.mtimeMs, size: st.size }
          } catch (err) { lastError = '解析 ' + path.basename(path.dirname(file)) + ' 失败：' + String(err?.message || err) }
        }
      })
      await Promise.all(workers)
      files = next
      buildMemories()
      builtAt = Date.now()
      await saveCache()
      log('记忆星穹：索引完成', memories.length, '条记忆 /', sessions.length, '个会话，', Date.now() - started, 'ms')
      return { memories: memories.length, sessions: sessions.length, ms: Date.now() - started }
    })().finally(() => { building = null })
    return building
  }

  function ensureFresh(maxAgeMs = 120000) {
    if (!builtAt) return rebuild()
    if (Date.now() - builtAt < maxAgeMs) return Promise.resolve(null)
    return rebuild()
  }

  /** 图谱：每个会话一个星系，节点限制在 limit 内，按最近活跃优先。 */
  function graph(limitCount = limit) {
    const bySession = new Map()
    for (const mem of memories) {
      if (!bySession.has(mem.sid)) bySession.set(mem.sid, [])
      bySession.get(mem.sid).push(mem)
    }
    let quota = 90
    if (memories.length > limitCount) {
      quota = Math.max(8, Math.floor(limitCount / Math.max(1, bySession.size)))
    }
    const picked = []
    for (const list of bySession.values()) {
      list.sort((a, b) => a.time - b.time)
      const take = list.length <= quota ? list : list.slice(list.length - quota)
      for (const m of take) picked.push(m)
    }
    const idSet = new Set(picked.map((m) => m.id))

    // 连线：共享标签 top2
    const tagIndex = new Map()
    for (const mem of picked) {
      for (const tag of mem.tags) {
        if (!tagIndex.has(tag)) tagIndex.set(tag, [])
        tagIndex.get(tag).push(mem)
      }
    }
    const links = []
    const seen = new Set()
    for (const mem of picked) {
      const score = new Map()
      for (const tag of mem.tags) {
        const bucket = tagIndex.get(tag) || []
        if (bucket.length > 40) continue
        for (const other of bucket) {
          if (other.id === mem.id) continue
          score.set(other.id, (score.get(other.id) || 0) + 1)
        }
      }
      const top = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
      for (const [otherId, weight] of top) {
        const a = mem.id < otherId ? mem.id : otherId
        const b = mem.id < otherId ? otherId : mem.id
        const key = a + '|' + b
        if (seen.has(key)) continue
        seen.add(key)
        links.push({ source: mem.id, target: otherId, weight })
      }
    }

    const sessionRows = sessions
      .filter((s) => bySession.has(s.id))
      .map((s) => ({
        id: s.id,
        title: s.title,
        cwd: s.cwd,
        count: bySession.get(s.id).length,
        shown: bySession.get(s.id).filter((m) => idSet.has(m.id)).length,
        last: s.last,
      }))

    return {
      builtAt,
      stats: {
        memories: memories.length,
        sessions: sessions.length,
        tags: new Set(memories.flatMap((m) => m.tags)).size,
        shown: picked.length,
        links: links.length,
      },
      sessions: sessionRows,
      nodes: picked.map((m) => ({
        id: m.id,
        sid: m.sid,
        date: m.date,
        time: m.time,
        importance: m.importance,
        tags: m.tags.slice(0, 4),
        manual: Boolean(m.manual),
        text: snippetOf(m, 90),
      })),
      links,
      error: lastError,
    }
  }

  function findSessionFile(sid) {
    for (const [file, entry] of Object.entries(files)) if (entry.sid === sid) return file
    return null
  }

  async function fullText(mem) {
    if (mem.manual) return mem.user
    const file = findSessionFile(mem.sid)
    if (!file) return mem.user + (mem.assistant ? '\n\n助手：' + mem.assistant : '')
    try {
      const events = await readSessionEvents(file)
      const turns = collectTurns(events)
      const t = turns[mem.idx]
      if (!t) return mem.user
      return '【`' + dayKey(t.time) + '】用户：\n' + t.user + (t.assistant ? '\n\n助手：\n' + t.assistant : '')
    } catch {
      return mem.user + (mem.assistant ? '\n\n助手：' + mem.assistant : '')
    }
  }

  /** 关键词检索：标签命中加权 + 文本包含。 */
  function search(query, { limit: max = 8, sid = '' } = {}) {
    const q = String(query || '').trim()
    if (!q) return []
    const terms = new Set()
    for (const t of q.toLowerCase().split(/\s+/)) if (t) terms.add(t)
    for (const t of extractTerms(q).keys()) terms.add(t)
    const qLower = q.toLowerCase()
    const hits = []
    for (const mem of memories) {
      if (sid && mem.sid !== sid) continue
      let score = 0
      const hay = (mem.user + '\n' + mem.assistant).toLowerCase()
      for (const t of terms) {
        if (!t) continue
        if (mem.tags.includes(t)) score += 3
        if (hay.includes(t)) score += t.length >= 2 ? 2 : 1
        if (mem.tags.some((x) => x.includes(t) || t.includes(x))) score += 0.6
      }
      if (hay.includes(qLower)) score += 4
      if (score > 0) {
        score += mem.importance * 0.8
        hits.push({ mem, score })
      }
    }
    hits.sort((a, b) => b.score - a.score || b.mem.time - a.mem.time)
    return hits.slice(0, max).map(({ mem, score }) => ({
      id: mem.id,
      sid: mem.sid,
      session: sessions.find((s) => s.id === mem.sid)?.title || '',
      date: mem.date,
      tags: mem.tags,
      importance: mem.importance,
      score: Math.round(score * 10) / 10,
      snippet: snippetOf(mem, 160),
    }))
  }

  async function addManual({ text, tags = [], importance = 0.9 }) {
    const t = String(text || '').trim()
    if (!t) throw new Error('记忆内容不能为空')
    const row = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: t,
      tags: (Array.isArray(tags) ? tags : []).map(String).filter(Boolean).slice(0, 8),
      importance: Math.max(0.3, Math.min(1, Number(importance) || 0.9)),
      time: Date.now(),
    }
    manual.push(row)
    await mkdir(store, { recursive: true })
    await writeFile(manualFile, JSON.stringify(manual, null, 2), 'utf8')
    builtAt = 0
    await rebuild()
    return row
  }

  async function recent(n = 5) {
    return [...memories].sort((a, b) => b.importance - a.importance || b.time - a.time).slice(0, n)
  }

  return {
    load: loadCache,
    rebuild,
    ensureFresh,
    graph,
    search,
    addManual,
    recent,
    fullText,
    get memories() { return memories },
    get sessions() { return sessions },
    get builtAt() { return builtAt },
    get size() { return memories.length },
    get error() { return lastError },
  }
}
