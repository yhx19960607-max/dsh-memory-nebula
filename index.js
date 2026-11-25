import { homedir } from 'node:os'
import path from 'node:path'

import { createIndexer, snippetOf } from './lib/indexer.js'

export const name = 'memory-nebula'
export const inject = ['webServer', 'tools']

const API_PATH = '/api/memory-nebula'
const STORE = () => path.join(homedir(), '.dsh', 'memory-nebula')
const SESSIONS = () => path.join(homedir(), '.dsh', 'sessions')

const textOutput = {
  schema: { type: 'string' },
  render: (_args, value) => [{ type: 'text', text: String(value ?? '') }],
}

const errText = (err) => String((err && err.message) || err || '未知错误')

function sendJson(res, code, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function localOnly(req, res) {
  const host = String(req.headers.host || '')
  const addr = String(req.socket?.remoteAddress || '')
  const okAddr = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
  const okHost = host === '' || /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)
  if (okAddr && okHost) return true
  sendJson(res, 403, { ok: false, error: '只接受本机请求' })
  return false
}

export function apply(ctx) {
  const log = (...args) => { try { ctx.logger?.info?.('[记忆星穹]', ...args) } catch { /* 无 logger */ } }
  const indexer = createIndexer({ root: SESSIONS(), store: STORE(), log })

  indexer.load()
    .then(() => indexer.rebuild())
    .catch((err) => log('首次索引失败：', errText(err)))

  // 每 10 分钟打一次增量，让正在聊的会话也慢慢亮起来
  try {
    ctx.effect(() => {
      const timer = setInterval(() => { indexer.ensureFresh(60000).catch(() => {}) }, 10 * 60 * 1000)
      timer.unref?.()
      return () => clearInterval(timer)
    }, 'memory-nebula: 定时重建')
  } catch { /* 定时器失败不影响主功能 */ }

  async function handle(req, res, url) {
    const route = (url.pathname.replace(new RegExp('^' + API_PATH), '') || '/').replace(/\/+$/, '') || '/'
    const method = String(req.method || 'GET').toUpperCase()

    if (method === 'GET' && route === '/graph') {
      await indexer.ensureFresh(600000).catch(() => {})
      return sendJson(res, 200, { ok: true, ...indexer.graph() })
    }
    if (method === 'GET' && route === '/status') {
      return sendJson(res, 200, {
        ok: true,
        builtAt: indexer.builtAt,
        memories: indexer.memories.length,
        sessions: indexer.sessions.length,
        store: STORE(),
        error: indexer.error,
      })
    }
    if (method === 'GET' && route === '/search') {
      await indexer.ensureFresh(600000).catch(() => {})
      const q = String(url.searchParams.get('q') || '')
      const limit = Math.max(1, Math.min(30, Number(url.searchParams.get('limit')) || 8))
      return sendJson(res, 200, { ok: true, query: q, hits: indexer.search(q, { limit }) })
    }
    if (method === 'GET' && route === '/memory') {
      const id = String(url.searchParams.get('id') || '')
      const mem = indexer.memories.find((m) => m.id === id)
      if (!mem) return sendJson(res, 404, { ok: false, error: '没有这条记忆' })
      const text = await indexer.fullText(mem)
      const session = indexer.sessions.find((s) => s.id === mem.sid)
      return sendJson(res, 200, {
        ok: true,
        id: mem.id,
        sid: mem.sid,
        session: session?.title || '',
        date: mem.date,
        tags: mem.tags,
        importance: mem.importance,
        text,
      })
    }
    if (method === 'POST' && route === '/rebuild') {
      const result = await indexer.rebuild()
      return sendJson(res, 200, { ok: true, ...result })
    }
    if (method === 'POST' && route === '/remember') {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      let body = {}
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { /* 空 body */ }
      const row = await indexer.addManual({
        text: body.text,
        tags: body.tags,
        importance: body.importance,
      })
      return sendJson(res, 200, { ok: true, id: row.id })
    }
    return sendJson(res, 404, { ok: false, error: '未知接口 ' + method + ' ' + route })
  }

  try {
    ctx.effect(() => ctx.webServer.register({
      kind: 'prefix',
      path: API_PATH,
      handler: async (req, res) => {
        if (!localOnly(req, res)) return
        try {
          await handle(req, res, new URL(req.url || '/', 'http://127.0.0.1'))
        } catch (err) {
          sendJson(res, 500, { ok: false, error: errText(err) })
        }
      },
    }), 'memory-nebula: HTTP API')
  } catch (err) {
    log('HTTP 路由没挂上：', errText(err))
  }

  /* ------------------------------------------------------------ 工具 ---- */

  try {
    ctx.tools.register({
      name: 'nebula_search',
      description: '在「记忆星穹」里搜索过去所有对话沉淀下来的记忆。问旧事、找原话、确认以前是否聊过某个话题、找约会安排或用户偏好时用它。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '关键词，中文直接写，空格分隔多个词' },
          limit: { type: 'number', description: '最多返回几条，默认 8' },
          session: { type: 'string', description: '只看某个会话 id，可留空' },
        },
        required: ['query'],
        additionalProperties: false,
      },
      output: textOutput,
      async execute(args) {
        const hits = indexer.search(String(args.query || ''), {
          limit: Math.max(1, Math.min(30, Number(args.limit) || 8)),
          sid: String(args.session || ''),
        })
        if (!hits.length) return '记忆星穹里没有找到「' + args.query + '」。'
        return hits.map((h, i) => {
          return (i + 1) + '. 【' + h.date + ' · ' + (h.session || '未命名会话') + '】' +
            '（id: ' + h.id + '，重要度 ' + h.importance + '）\n' + h.snippet
        }).join('\n\n') + '\n\n需要全文就用 nebula_read 传上面的 id。'
      },
    })
  } catch (err) { log('nebula_search 没挂上：', errText(err)) }

  try {
    ctx.tools.register({
      name: 'nebula_read',
      description: '读「记忆星穹」里某条记忆的完整原文，或某个会话 / 某一天的全部记忆。需要完整上下文而不只是搜索片段时用它。',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '记忆 id，来自 nebula_search 的结果' },
          session: { type: 'string', description: '读某个会话的全部记忆，传会话 id' },
          date: { type: 'string', description: '读某一天的全部记忆，格式 YYYY-MM-DD' },
          limit: { type: 'number', description: '按会话/日期读时最多几条，默认 20' },
        },
        additionalProperties: false,
      },
      output: textOutput,
      async execute(args) {
        const limit = Math.max(1, Math.min(60, Number(args.limit) || 20))
        if (args.id) {
          const mem = indexer.memories.find((m) => m.id === String(args.id))
          if (!mem) return '没有这条记忆，id 可能过期了，先用 nebula_search 重搜。'
          const text = await indexer.fullText(mem)
          return '【' + mem.date + ' · ' + (indexer.sessions.find((s) => s.id === mem.sid)?.title || '') + '】\n' + text
        }
        let rows = indexer.memories
        if (args.session) rows = rows.filter((m) => m.sid === String(args.session))
        if (args.date) rows = rows.filter((m) => m.date === String(args.date))
        if (!args.session && !args.date) return '要传 id、session 或 date 中的一个。'
        rows = rows.slice().sort((a, b) => a.time - b.time).slice(-limit)
        if (!rows.length) return '那段时间没有记忆。'
        return rows.map((m) => '【' + m.date + ' ' + snippetOf(m, 12) + '】\n用户：' + m.user +
          (m.assistant ? '\n助手：' + m.assistant : '')).join('\n\n---\n\n').slice(0, 24000)
      },
    })
  } catch (err) { log('nebula_read 没挂上：', errText(err)) }

  try {
    ctx.tools.register({
      name: 'nebula_remember',
      description: '把一条值得长期记住的事写进「记忆星穹」（像给星空点一颗新星）。用户明确说“记住这个”、或你判断某条约定/偏好以后会用到时用它。',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '要记住的内容，一句到几句，写清楚' },
          tags: { type: 'array', items: { type: 'string' }, description: '可选标签，2~5 个' },
          importance: { type: 'number', description: '重要度 0~1，默认 0.9' },
        },
        required: ['text'],
        additionalProperties: false,
      },
      output: textOutput,
      async execute(args) {
        const row = await indexer.addManual({
          text: args.text,
          tags: args.tags,
          importance: args.importance,
        })
        return '已点亮一颗新星（id: ' + row.id + '）：' + snippetOf({ user: row.text }, 60)
      },
    })
  } catch (err) { log('nebula_remember 没挂上：', errText(err)) }

  /* ------------------------------------------------------------ 指令 ---- */

  try {
    ctx.effect(() => ctx.commands.register({
      name: 'nebula',
      description: '把「记忆星穹」里最近的记忆摘要递给这个会话，让助手先接上记忆',
      input: { hint: '可留空；也可以写一句这次想回忆什么' },
      handler: async (invocation) => {
        const sid = String(invocation?.agent?.id || '')
        let rows = []
        try {
          await indexer.ensureFresh(600000)
          rows = sid
            ? indexer.memories.filter((m) => m.sid === sid).sort((a, b) => b.time - a.time).slice(0, 12)
            : indexer.recent(8)
          if (!rows.length) rows = indexer.recent(8)
        } catch (err) {
          return { kind: 'error', text: '读记忆失败：' + errText(err) }
        }
        if (!rows.length) return { kind: 'success', text: '星穹里还没有星星：先聊出一点内容，或者在面板里重建索引。' }
        const lines = ['【记忆星穹 · 最近的记忆】', '回答之前先看一遍下面这些旧事，需要更多细节就用 nebula_search。', '']
        for (const mem of rows) {
          lines.push('· ' + mem.date + '｜' + snippetOf(mem, 100))
        }
        const text = lines.join('\n')
        try {
          const agent = (() => { try { return ctx.get('agents')?.get(sid) } catch { return null } })() || invocation.agent
          if (!agent || typeof agent.followup !== 'function') return { kind: 'error', text: '这个会话没醒着，没法把记忆递过去。' }
          await agent.followup({
            id: 'nebula-' + Date.now().toString(36),
            role: 'user',
            content: [{ type: 'text', text }],
            source: { kind: 'plugin:memory-nebula' },
          })
        } catch (err) {
          return { kind: 'error', text: '递记忆失败：' + errText(err) }
        }
        return { kind: 'success', text: '已把最近 ' + rows.length + ' 条记忆递给这个会话。' }
      },
    }), 'memory-nebula: /nebula')
  } catch (err) { log('/nebula 没挂上：', errText(err)) }
}
