/**
 * 会话记录读取：解多帧 zstd、抽真人发言与助手正文、拼成"回合"。
 * DSH 的 session.v4.jsonl.zstd 是首尾相接的多个 zstd 帧，整份解只会得到第一帧。
 */
import { open, readFile, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

export const dshHome = () => path.join(homedir(), '.dsh')
export const sessionsRoot = () => path.join(dshHome(), 'sessions')

/** 按魔数切帧。压缩数据里偶发同字节的概率很低。 */
export function splitZstdFrames(buf) {
  const starts = []
  let i = 0
  while (i < buf.length) {
    const at = buf.indexOf(ZSTD_MAGIC, i)
    if (at < 0) break
    starts.push(at)
    i = at + 4
  }
  const frames = []
  for (let k = 0; k < starts.length; k += 1) {
    const end = k + 1 < starts.length ? starts[k + 1] : buf.length
    if (end - starts[k] >= 4) frames.push(buf.subarray(starts[k], end))
  }
  return frames
}

/** 解一整份多帧文件；截断帧、坏帧跳过。 */
export function decompressZstd(buf) {
  const out = []
  for (const frame of splitZstdFrames(buf)) {
    try { out.push(zlib.zstdDecompressSync(frame)) } catch { /* 截断或坏帧 */ }
  }
  return Buffer.concat(out)
}

/** 读全部事件。逐帧解析，坏行跳过。 */
export async function readSessionEvents(file) {
  const buf = await readFile(file)
  const events = []
  for (const frame of splitZstdFrames(buf)) {
    let text
    try { text = zlib.zstdDecompressSync(frame).toString('utf8') } catch { continue }
    for (const line of text.split('\n')) {
      const s = line.trim()
      if (!s) continue
      try {
        const ev = JSON.parse(s)
        if (ev && typeof ev === 'object' && ev.type) events.push(ev)
      } catch { /* 半行 */ }
    }
  }
  return events
}

/** content 可能是字符串、{type,text} 或内容块数组。只取可读文本。 */
export function blocksToText(content) {
  if (typeof content === 'string') return content
  if (!content) return ''
  if (!Array.isArray(content)) return typeof content.text === 'string' ? content.text : ''
  const out = []
  for (const block of content) {
    if (!block) continue
    if (typeof block === 'string') { out.push(block); continue }
    if (block.type === 'text' && typeof block.text === 'string') out.push(block.text)
  }
  return out.join('\n').trim()
}

const pad2 = (n) => String(n).padStart(2, '0')

export function dayKey(ms) {
  const d = new Date(Number(ms) || Date.now())
  if (Number.isNaN(d.getTime())) return '1970-01-01'
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

/**
 * 把事件流压成回合：一条真人发言 + 它之后的助手正文。
 * 跳过 subagent 会话、工具调用、推理过程、系统注入。
 */
export function collectTurns(events) {
  const turns = []
  let current = null
  for (const ev of events) {
    if (!ev || !ev.type) continue
    if (ev.type === 'user/message') {
      if (ev.data?.source?.kind !== 'user') continue
      const text = blocksToText(ev.data?.content).trim()
      if (!text) continue
      if (current && (current.user || current.assistant)) turns.push(current)
      current = { user: text, assistant: '', time: Number(ev.time) || 0 }
    } else if (ev.type === 'assistant/message') {
      if (!current) continue
      const text = blocksToText(ev.data?.message?.content).trim()
      if (!text) continue
      current.assistant = current.assistant ? current.assistant + '\n\n' + text : text
    }
  }
  if (current && (current.user || current.assistant)) turns.push(current)
  return turns.filter((t) => t.user.trim().length >= 2)
}

/** 读会话头（第一行 session 元信息），只读文件开头。 */
export async function readSessionHead(file, maxBytes = 262144) {
  const fh = await open(file, 'r')
  try {
    const buf = Buffer.alloc(maxBytes)
    const { bytesRead } = await fh.read(buf, 0, maxBytes, 0)
    if (!bytesRead) return null
    let text = ''
    for (const frame of splitZstdFrames(buf.subarray(0, bytesRead))) {
      try { text += zlib.zstdDecompressSync(frame).toString('utf8') } catch { break }
      if (text.includes('\n')) break
    }
    const line = text.split('\n').find((x) => x.trim())
    return line ? JSON.parse(line) : null
  } finally {
    await fh.close()
  }
}

/** 递归找所有会话文件。 */
export async function findSessionFiles(root = sessionsRoot()) {
  const out = []
  async function walk(dir) {
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) await walk(p)
      else if (e.name === 'session.v4.jsonl.zstd') out.push(p)
    }
  }
  await walk(root)
  return out
}

/** 会话标题：优先取第一句真人发言，去掉换行与多余空白。 */
export function titleOf(turns, meta) {
  const first = turns[0]?.user || ''
  const clean = first.replace(/[#>*`\n\r]/g, ' ').replace(/\s+/g, ' ').trim()
  if (clean) return clean.length > 26 ? clean.slice(0, 26) + '…' : clean
  return meta?.title || path.basename(meta?.cwd || '') || '未命名会话'
}

/** 从会话文件路径推出会话 id 与工作区目录名。 */
export function idOf(file) {
  const dir = path.dirname(file)
  const base = path.basename(dir)
  if (base.startsWith('session-')) return base
  return base
}

export { stat }
