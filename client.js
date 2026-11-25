window.__ModuleLoader__.load({
  id: 'dsh-memory-nebula',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const useState = React.useState
    const useEffect = React.useEffect
    const useRef = React.useRef
    const useMemo = React.useMemo

    const API = '/api/memory-nebula'
    const TOKEN = (typeof window !== 'undefined' && window.__MEMORY_NEBULA_TOKEN__) || ''

    /* ============================================================== 样式 ==== */

    const CSS = `
.mn-root { position:absolute; inset:0; display:flex; flex-direction:column; background:rgba(4,6,12,var(--mn-veil,.94)); color:#dbe8f6;
  font-family: var(--dsw-font-family, -apple-system, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif);
  overflow:hidden; }
.mn-head { height:52px; flex:none; display:flex; align-items:center; gap:14px; padding:0 18px;
  border-bottom:1px solid rgba(120,190,255,.12); background:linear-gradient(180deg, rgba(10,18,32,.9), rgba(5,7,13,.6)); z-index:5; }
.mn-title { font-size:15px; font-weight:600; letter-spacing:.16em; color:#eaf6ff; }
.mn-title b { color:#8fd8ff; font-weight:600; }
.mn-sub { font-size:11px; color:#6f8ba6; letter-spacing:.08em; }
.mn-stats { margin-left:auto; display:flex; gap:18px; font-size:11px; color:#7b99b6; }
.mn-stats i { font-style:normal; color:#cfe9ff; font-weight:600; font-size:13px; margin-right:4px; }
.mn-body { flex:1; display:flex; min-height:0; }
.mn-side { width:320px; flex:none; display:flex; flex-direction:column; gap:12px; padding:14px;
  border-right:1px solid rgba(120,190,255,.1); background:linear-gradient(180deg, rgba(8,13,24,.92), rgba(5,7,13,.96)); z-index:4; }
.mn-search { display:flex; gap:8px; }
.mn-input { flex:1; height:34px; border-radius:9px; border:1px solid rgba(120,190,255,.18); background:rgba(12,22,38,.85);
  color:#dff1ff; padding:0 12px; font-size:12.5px; outline:none; transition:.18s; }
.mn-input::placeholder { color:#5c7691; }
.mn-input:focus { border-color:rgba(120,200,255,.55); box-shadow:0 0 0 3px rgba(80,170,255,.12); }
.mn-btn { height:34px; padding:0 12px; border-radius:9px; border:1px solid rgba(120,190,255,.2);
  background:rgba(16,30,50,.8); color:#a9d4f5; font-size:12px; cursor:pointer; transition:.18s; white-space:nowrap; }
.mn-btn:hover { border-color:rgba(120,200,255,.5); color:#dff3ff; background:rgba(22,44,72,.9); }
.mn-btn:active { transform:translateY(1px); }
.mn-list { flex:1; overflow:auto; display:flex; flex-direction:column; gap:7px; padding-right:2px; }
.mn-list::-webkit-scrollbar { width:6px; }
.mn-list::-webkit-scrollbar-thumb { background:rgba(110,170,230,.22); border-radius:3px; }
.mn-item { border:1px solid rgba(120,190,255,.1); border-radius:10px; padding:9px 10px; cursor:pointer;
  background:linear-gradient(180deg, rgba(14,24,40,.75), rgba(9,15,26,.75)); transition:.16s; }
.mn-item:hover { border-color:rgba(120,200,255,.42); background:rgba(20,36,60,.85); }
.mn-item.on { border-color:rgba(255,210,120,.55); box-shadow:0 0 18px rgba(255,190,80,.08) inset; }
.mn-meta { display:flex; gap:6px; align-items:center; font-size:10px; color:#6e8ba6; margin-bottom:4px; }
.mn-meta b { color:#9fc6e6; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mn-tag { font-size:9.5px; padding:1px 5px; border-radius:4px; background:rgba(90,170,255,.12); color:#8fc6f0; border:1px solid rgba(90,170,255,.16); }
.mn-snippet { font-size:11.5px; line-height:1.55; color:#b9d3e8; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.mn-stage { position:relative; flex:1; min-width:0; overflow:hidden; cursor:grab; }
.mn-stage:active { cursor:grabbing; }
.mn-canvas { display:block; width:100%; height:100%; }
.mn-hint { position:absolute; left:50%; bottom:14px; transform:translateX(-50%); font-size:11px; color:#5f7c99;
  letter-spacing:.08em; pointer-events:none; user-select:none; }
.mn-detail { position:absolute; right:18px; top:70px; width:380px; max-height:calc(100% - 110px); overflow:auto;
  border:1px solid rgba(140,200,255,.22); border-radius:14px; padding:16px 18px;
  background:linear-gradient(180deg, rgba(10,20,36,.96), rgba(6,11,21,.97)); backdrop-filter:blur(14px);
  box-shadow:0 24px 60px rgba(0,0,0,.55), 0 0 40px rgba(80,160,255,.06); z-index:8; }
.mn-detail h4 { margin:0 0 8px; font-size:12px; font-weight:600; letter-spacing:.1em; color:#8fd8ff; }
.mn-detail .dt { font-size:10.5px; color:#6e8ba6; margin-bottom:10px; }
.mn-detail .txt { font-size:12.5px; line-height:1.72; color:#cfe2f3; white-space:pre-wrap; word-break:break-word; }
.mn-summary { background:linear-gradient(180deg, rgba(34,66,104,.35), rgba(18,32,52,.3));
  border:1px solid rgba(120,200,255,.22); border-radius:12px; padding:12px 14px; margin-bottom:14px; }
.mn-summary .s-label { font-size:9.5px; letter-spacing:.18em; color:#7fb6dd; margin-bottom:7px; }
.mn-summary .s-title { font-size:13px; color:#eaf7ff; line-height:1.55; font-weight:500; }
.mn-summary .s-body { font-size:11.5px; color:#a6c4dc; line-height:1.65; margin-top:7px; }
.mn-summary .s-meta { font-size:10px; color:#6f92ae; margin-top:8px; letter-spacing:.04em; }
.mn-keynav { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 12px; }
.mn-keychip { padding:4px 9px; border-radius:7px; border:1px solid rgba(120,200,255,.2);
  background:rgba(18,34,54,.85); color:#9cc6e6; font-size:10.5px; cursor:pointer; transition:.16s; }
.mn-keychip:hover { border-color:rgba(120,210,255,.6); color:#eaf7ff; }
.mn-para { margin:0 0 9px; border-radius:8px; transition:background .35s, box-shadow .35s; }
.mn-para:last-child { margin-bottom:0; }
.mn-para.hit { background:rgba(120,200,255,.16); box-shadow:0 0 0 7px rgba(120,200,255,.16); }
.mn-sort { display:flex; gap:6px; align-items:center; }
.mn-sort .lbl { font-size:10px; color:#5f7c99; letter-spacing:.1em; }
.mn-chat { display:flex; flex-direction:column; gap:10px; }
.mn-msg { display:flex; gap:8px; align-items:flex-start; }
.mn-msg.user { flex-direction:row-reverse; }
.mn-msg .who { font-size:9.5px; color:#7fa8c8; padding-top:5px; flex:none; letter-spacing:.06em; }
.mn-bubble { max-width:87%; padding:9px 12px; border-radius:12px; font-size:12px; line-height:1.72;
  white-space:pre-wrap; word-break:break-word; }
.mn-msg.user .mn-bubble { background:rgba(38,86,136,.42); border:1px solid rgba(95,175,255,.28);
  border-top-right-radius:4px; color:#e2f4ff; }
.mn-msg.bot .mn-bubble { background:rgba(22,34,52,.88); border:1px solid rgba(120,190,255,.13);
  border-top-left-radius:4px; color:#c9dcee; }
.mn-detail .close { position:absolute; right:12px; top:10px; width:24px; height:24px; border-radius:7px; border:1px solid rgba(120,190,255,.18);
  background:transparent; color:#7e9db8; cursor:pointer; line-height:1; font-size:14px; }
.mn-detail .close:hover { color:#dff3ff; border-color:rgba(120,200,255,.5); }
.mn-empty { font-size:11.5px; color:#5f7c99; padding:14px 6px; line-height:1.6; }
.mn-tip { position:absolute; pointer-events:none; z-index:9; max-width:280px; padding:8px 10px; border-radius:8px;
  background:rgba(8,16,28,.94); border:1px solid rgba(120,200,255,.28); color:#d8ecff; font-size:11.5px;
  line-height:1.5; box-shadow:0 8px 24px rgba(0,0,0,.5); display:none; }
.mn-side { transition:width .28s cubic-bezier(.4,0,.2,1), padding .28s, opacity .2s, border-color .2s; }
.mn-side.closed { width:0; padding:0; opacity:0; overflow:hidden; border-right-color:transparent; }
.mn-btn.on { border-color:rgba(255,205,110,.52); color:#ffe1a8; background:rgba(84,58,16,.34); }
.mn-settings { position:absolute; right:18px; top:70px; width:352px; max-height:calc(100% - 100px); overflow:auto;
  border:1px solid rgba(140,200,255,.22); border-radius:14px; padding:16px 18px 14px;
  background:linear-gradient(180deg, rgba(10,20,36,.97), rgba(6,11,21,.98)); backdrop-filter:blur(14px);
  box-shadow:0 24px 60px rgba(0,0,0,.55), 0 0 40px rgba(80,160,255,.06); z-index:9; }
.mn-settings h4 { margin:0 0 2px; font-size:12px; font-weight:600; letter-spacing:.12em; color:#8fd8ff; }
.mn-settings .close { position:absolute; right:12px; top:10px; width:24px; height:24px; border-radius:7px;
  border:1px solid rgba(120,190,255,.18); background:transparent; color:#7e9db8; cursor:pointer; font-size:14px; line-height:1; }
.mn-settings .close:hover { color:#dff3ff; border-color:rgba(120,200,255,.5); }
.mn-group { font-size:10px; letter-spacing:.16em; color:#5f7c99; margin:16px 0 4px; }
.mn-row { display:flex; align-items:center; gap:10px; margin:9px 0; font-size:11.5px; color:#a9c4dd; }
.mn-row > span:first-child { flex:none; width:96px; }
.mn-row input[type=range] { flex:1; min-width:0; accent-color:#6fc7ff; height:18px; }
.mn-row .val { flex:none; width:46px; text-align:right; color:#7fa8cb; font-weight:500; font-variant-numeric:tabular-nums; }
.mn-thumb { width:34px; height:22px; border-radius:5px; background-size:cover; background-position:center;
  border:1px solid rgba(255,255,255,.18); flex:none; }
.mn-row input.mn-text { flex:1; min-width:0; height:30px; border-radius:8px; border:1px solid rgba(120,190,255,.18);
  background:rgba(12,22,38,.85); color:#dff1ff; padding:0 10px; font-size:11.5px; outline:none; }
.mn-row input.mn-text:focus { border-color:rgba(120,200,255,.55); box-shadow:0 0 0 3px rgba(80,170,255,.1); }
.mn-row input[type=color] { width:40px; height:24px; border:1px solid rgba(120,190,255,.3); border-radius:6px;
  background:transparent; padding:0; cursor:pointer; margin-left:auto; }
.mn-swatches { display:flex; gap:7px; margin:2px 0 6px 106px; }
.mn-swatch { width:20px; height:20px; border-radius:6px; border:1px solid rgba(255,255,255,.16); cursor:pointer; }
.mn-swatch.on { outline:2px solid #8fd8ff; outline-offset:1px; }
.mn-sw { position:relative; width:34px; height:19px; border-radius:10px; border:1px solid rgba(120,190,255,.25);
  background:rgba(20,36,56,.9); cursor:pointer; flex:none; margin-left:auto; }
.mn-sw::after { content:''; position:absolute; left:2px; top:2px; width:13px; height:13px; border-radius:50%; background:#6f8ba6; transition:.16s; }
.mn-sw.on { background:rgba(60,130,190,.55); border-color:rgba(120,200,255,.55); }
.mn-sw.on::after { left:17px; background:#eaf7ff; }
.mn-chips { display:flex; flex-wrap:wrap; gap:6px; margin:6px 0 2px; }
.mn-chip { padding:4px 9px; border-radius:7px; border:1px solid rgba(120,190,255,.18);
  background:rgba(14,26,42,.8); color:#8fb4d4; font-size:10.5px; cursor:pointer; transition:.15s; }
.mn-chip:hover { border-color:rgba(120,200,255,.45); color:#dff3ff; }
.mn-chip.on { border-color:rgba(255,205,110,.55); color:#ffe1a8; background:rgba(84,58,16,.32); }
.mn-settings .foot { display:flex; gap:8px; margin-top:18px; }
.mn-crash { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:14px; padding:40px; text-align:center; background:#05070d; color:#cfe2f3; }
.mn-crash .t { font-size:14px; color:#ffb9a6; letter-spacing:.06em; }
.mn-crash .b { max-width:540px; font-size:11.5px; line-height:1.75; color:#8aa6bf; white-space:pre-wrap; word-break:break-word; }
.mn-spin { display:inline-block; width:12px; height:12px; border:1.5px solid rgba(140,210,255,.25); border-top-color:#8fd8ff;
  border-radius:50%; animation:mnspin .8s linear infinite; vertical-align:-1px; margin-right:6px; }
@keyframes mnspin { to { transform:rotate(360deg); } }
`

    function ensureCss() {
      if (document.getElementById('mn-style')) return
      const el = document.createElement('style')
      el.id = 'mn-style'
      el.textContent = CSS
      document.head.appendChild(el)
    }

    /* ============================================================ 星图引擎 ==== */

    const TAU = Math.PI * 2
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

    const THEMES = [
      { id: 'ocean', name: '星海', bg: '#070d18', shift: 0 },
      { id: 'cyber', name: '赛博紫', bg: '#0d0718', shift: 46 },
      { id: 'abyss', name: '深海青', bg: '#06120f', shift: -86 },
      { id: 'ember', name: '暖金', bg: '#170c09', shift: 116 },
      { id: 'indigo', name: '靛蓝', bg: '#101a2e', shift: -30 },
      { id: 'mono', name: '极夜', bg: '#000000', shift: 0 },
    ]

    const LAYOUTS = [
      { id: 'organic', name: '不规则星云' },
      { id: 'sphere', name: '球面' },
      { id: 'disk', name: '圆盘银河' },
      { id: 'spiral', name: '双旋臂' },
      { id: 'helix', name: '螺旋塔' },
      { id: 'grid', name: '立方格' },
      { id: 'ring', name: '圆环' },
      { id: 'brain', name: '大脑' },
    ]

    const DEFAULT_SETTINGS = {
      bg: '#070d18',
      veil: 0.92,
      star: 1,
      link: 1,
      spin: 1,
      meteors: true,
      names: false,
      side: true,
      theme: 'ocean',
      layout: 'organic',
      nodeScale: 1,
      dust: 1,
      breath: 1,
      workspaces: [],
      limit: 0,
      userName: '你',
      botName: '助手',
      bgImage: '',
    }

    const hexToRgb = (hex) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''))
      if (!m) return { r: 7, g: 13, b: 24 }
      const n = parseInt(m[1], 16)
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    }

    /** 选图后压到 1600px、JPEG，避免撑爆 localStorage。 */
    function compressImage(file, maxW = 1600) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
          try {
            const ratio = (img.naturalWidth || maxW) > maxW ? maxW / img.naturalWidth : 1
            const w = Math.max(1, Math.round((img.naturalWidth || maxW) * ratio))
            const h = Math.max(1, Math.round((img.naturalHeight || maxW) * ratio))
            const canvas = document.createElement('canvas')
            canvas.width = w
            canvas.height = h
            canvas.getContext('2d').drawImage(img, 0, 0, w, h)
            resolve(canvas.toDataURL('image/jpeg', 0.78))
          } catch (err) {
            reject(err)
          } finally {
            URL.revokeObjectURL(url)
          }
        }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片解码失败')) }
        img.src = url
      })
    }

    function loadSettings() {
      try {
        const raw = JSON.parse(localStorage.getItem('dsh-memory-nebula:settings') || '{}')
        return { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) }
      } catch {
        return { ...DEFAULT_SETTINGS }
      }
    }

    function saveSettings(next) {
      try { localStorage.setItem('dsh-memory-nebula:settings', JSON.stringify(next)) } catch { /* 隐私模式 */ }
    }
    const hueColor = (hue, light = 62, alpha = 1) => 'hsla(' + hue + ', 85%, ' + light + '%, ' + alpha + ')'

    class Nebula {
      constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        this.nodes = []
        this.links = []
        this.sessions = []
        this.sessionMap = new Map()
        this.rx = -0.3
        this.ry = 0.35
        this.zoom = 1.05
        this.targetZoom = 1.05
        this.spin = 0
        this.dragging = false
        this.lastX = 0
        this.lastY = 0
        this.velX = 0
        this.velY = 0
        this.hover = null
        this.selected = null
        this.highlight = new Set()
        this.sprites = new Map()
        this.stars = this.makeDust(900)
        this.meteors = []
        this.dpr = 1
        this.w = 0
        this.h = 0
        this.frame = 0
        this.alive = true
        this.onSelect = null
        this.onHover = null
        this.opts = { ...DEFAULT_SETTINGS }
        this.morph = null
        this.bgImg = null
        this.bgImageSrc = ''
        this.bind()
        this.resize()
        this.loop()
      }

      makeDust(n) {
        const out = []
        for (let i = 0; i < n; i += 1) {
          const u = Math.random()
          const v = Math.random()
          const theta = u * TAU
          const phi = Math.acos(2 * v - 1)
          const r = 26 + Math.random() * 60
          out.push({
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.cos(phi),
            z: r * Math.sin(phi) * Math.sin(theta),
            a: 0.12 + Math.random() * 0.5,
            s: 0.4 + Math.random() * 1.1,
          })
        }
        return out
      }

      resize() {
        const rect = this.canvas.getBoundingClientRect()
        this.dpr = Math.min(2, window.devicePixelRatio || 1)
        this.w = Math.max(1, rect.width)
        this.h = Math.max(1, rect.height)
        this.canvas.width = Math.round(this.w * this.dpr)
        this.canvas.height = Math.round(this.h * this.dpr)
      }

      /** 每个会话一个星系：中心铺在球面里，节点沿旋臂排开。 */
      setData(g) {
        const sessions = (g.sessions || []).slice()
        const prev = new Map(this.sessions.map((s) => [s.id, { cx: s.cx, cy: s.cy, cz: s.cz }]))
        const centers = this.sessionCenters(sessions, this.opts.layout)
        this.clusters = []
        this.sessions = sessions.map((s, i) => {
          const c = centers[i]
          const p = prev.get(s.id)
          return {
            id: s.id,
            title: s.title || '未命名会话',
            count: s.count || 0,
            last: s.last || 0,
            cwd: s.cwd || '',
            hue: Math.round((i * 137.508 + 190) % 360),
            tx: c.x,
            ty: c.y,
            tz: c.z,
            cx: p ? p.cx : c.x,
            cy: p ? p.cy : c.y,
            cz: p ? p.cz : c.z,
            core: 0,
            cluster: 0,
          }
        })
        this.morph = prev.size ? { t: 0, prev } : null
        this.sessionMap = new Map(this.sessions.map((s) => [s.id, s]))

        const groups = new Map()
        for (const node of g.nodes || []) {
          if (!groups.has(node.sid)) groups.set(node.sid, [])
          groups.get(node.sid).push(node)
        }

        const nodes = []
        const chains = []
        let order = 0
        for (const s of this.sessions) {
          const list = (groups.get(s.id) || []).slice().sort((a, b) => a.time - b.time)
          const n = list.length
          s.core = clamp(0.3 + 0.46 * Math.sqrt(n / 8), 0.32, 1.12)
          const chain = []
          list.forEach((node, i) => {
            const t = n <= 1 ? 0.5 : (i + 0.5) / n
            const arm = i % 2 === 0 ? 0 : Math.PI
            const r = s.core * (0.16 + 0.84 * Math.pow(t, 0.62))
            const theta = arm + t * 4.6 + (i % 3) * 0.55
            const jitter = (Math.sin(i * 12.9898 + s.hue) * 43758.5453) % 1
            const y = (jitter - 0.5) * s.core * (0.32 - 0.2 * t)
            nodes.push({
              id: node.id,
              sid: node.sid,
              date: node.date,
              time: node.time,
              importance: node.importance || 0.3,
              tags: node.tags || [],
              manual: Boolean(node.manual),
              text: node.text || '',
              hue: s.hue,
              r,
              theta: theta + (jitter * 0.25),
              yy: y,
              session: s,
              index: order++,
            })
            chain.push(nodes[nodes.length - 1])
          })
          if (chain.length > 1) chains.push(chain)
        }
        this.nodes = nodes
        this.brainLines = this.opts.layout === 'brain' ? this.makeBrainLines() : null
        this.buildDust()

        const byId = new Map(nodes.map((n) => [n.id, n]))
        const links = (g.links || [])
          .map((l) => ({ a: byId.get(l.source), b: byId.get(l.target), w: l.weight || 1 }))
          .filter((l) => l.a && l.b)
        for (const chain of chains) {
          for (let i = 1; i < chain.length; i += 1) {
            links.push({ a: chain[i - 1], b: chain[i], w: 0.5, chain: true })
          }
        }
        this.links = links

        this.meteors = []
        const cross = this.links.filter((l) => l.a.sid !== l.b.sid)
        const pool = cross.length ? cross : this.links
        for (let i = 0; i < Math.min(22, pool.length); i += 1) {
          const link = pool[Math.floor(Math.random() * pool.length)]
          this.meteors.push({ link, t: Math.random(), speed: 0.12 + Math.random() * 0.3, phase: Math.random() * 10 })
        }
      }

      setOptions(next) {
        const prevLayout = this.opts.layout
        const prevDust = this.opts.dust
        this.opts = { ...this.opts, ...(next || {}) }
        if (next && next.bgImage !== undefined && next.bgImage !== this.bgImageSrc) {
          this.bgImageSrc = next.bgImage || ''
          this.bgImg = null
          if (this.bgImageSrc) {
            const img = new Image()
            img.onload = () => { this.bgImg = img }
            img.onerror = () => { this.bgImg = null }
            img.src = this.bgImageSrc
          }
        }
        const theme = THEMES.find((t) => t.id === this.opts.theme)
        this.opts.hueShift = theme ? theme.shift : 0
        if (next && next.layout && next.layout !== prevLayout) {
          this.relayout()
          const view = {
            brain: { rx: -0.06, ry: 0.1 },
            disk: { rx: -0.62, ry: 0.4 },
            helix: { rx: -0.08, ry: 0.5 },
            grid: { rx: -0.45, ry: 0.5 },
            ring: { rx: -0.75, ry: 0.3 },
            sphere: { rx: -0.3, ry: 0.35 },
            organic: { rx: -0.3, ry: 0.35 },
            spiral: { rx: -0.55, ry: 0.4 },
          }[next.layout]
          if (view) { this.rx = view.rx; this.ry = view.ry }
        }
        if (next && next.dust !== undefined && this.opts.dust !== prevDust) this.buildDust()
      }

      hue(base) {
        return Math.round(Number(base || 0) + (this.opts.hueShift || 0) + 720) % 360
      }

      /** 每个会话在空间里的落点：规则或不规则的几种排布。 */
      sessionCenters(sessions, mode) {
        const N = Math.max(1, sessions.length)
        const rnd = (i, k) => {
          const v = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453
          return v - Math.floor(v)
        }
        const out = []
        for (let i = 0; i < sessions.length; i += 1) {
          const t = (i + 0.5) / N
          const phi = Math.acos(1 - 2 * t)
          const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5)
          let x = 0
          let y = 0
          let z = 0
          if (mode === 'sphere') {
            x = 10.2 * Math.sin(phi) * Math.cos(theta)
            y = 10.2 * Math.cos(phi) * 0.78
            z = 10.2 * Math.sin(phi) * Math.sin(theta)
          } else if (mode === 'disk') {
            const r = 3.2 + 7.2 * Math.sqrt(t)
            x = r * Math.cos(theta)
            z = r * Math.sin(theta)
            y = (rnd(i, 1) - 0.5) * 1.4
          } else if (mode === 'spiral') {
            const r = 2.4 + 8.4 * t
            const a = (i % 2) * Math.PI + r * 0.62
            x = r * Math.cos(a)
            z = r * Math.sin(a)
            y = (rnd(i, 2) - 0.5) * 1.0
          } else if (mode === 'helix') {
            const a = t * TAU * 2.6 + (i % 2) * Math.PI
            const r = 3.2 + rnd(i, 3) * 0.7
            x = r * Math.cos(a)
            z = r * Math.sin(a)
            y = (t - 0.5) * 15
          } else if (mode === 'grid') {
            const side = Math.ceil(Math.cbrt(N))
            const ix = i % side
            const iy = Math.floor(i / side) % side
            const iz = Math.floor(i / (side * side)) % side
            const d = Math.max(1, side - 1)
            x = (ix / d - 0.5) * 18 + (rnd(i, 4) - 0.5) * 0.9
            y = (iy / d - 0.5) * 14 + (rnd(i, 5) - 0.5) * 0.9
            z = (iz / d - 0.5) * 18 + (rnd(i, 6) - 0.5) * 0.9
          } else if (mode === 'ring') {
            const a = i * 2.399963
            const r = 9.2 + rnd(i, 7) * 0.9
            x = r * Math.cos(a)
            z = r * Math.sin(a)
            y = (rnd(i, 8) - 0.5) * 1.0
          } else if (mode === 'brain') {
            // 两个半球：会话沿脑回轨道排开，像大脑的沟回
            const sx = i % 2 === 0 ? -1 : 1
            const lane = i % 5
            const u = (i + 0.5) / N
            const phiB = Math.PI * (0.16 + 0.66 * u)
            const thetaB = (lane / 5) * Math.PI * 1.4 + 0.5 + u * 2.2
            const wob = 1 + 0.09 * Math.sin(u * 17 + lane * 2.1)
            const px = Math.sin(phiB) * Math.cos(thetaB)
            const py = Math.cos(phiB)
            const pz = Math.sin(phiB) * Math.sin(thetaB)
            x = sx * (0.38 + 0.62 * Math.abs(px)) * 9.6 * wob
            y = py * 8.4 * wob
            z = pz * 5.4 * wob
          } else {
            // organic：半径、方位都打散，像一团不规则的星云
            const R = 5.8 + 5.8 * rnd(i, 9)
            const ph = phi + (rnd(i, 10) - 0.5) * 0.55
            const th = theta + (rnd(i, 11) - 0.5) * 0.7
            x = R * Math.sin(ph) * Math.cos(th)
            y = R * Math.cos(ph) * 0.85
            z = R * Math.sin(ph) * Math.sin(th)
          }
          out.push({ x, y, z })
        }
        return out
      }

      /** 换布局：只挪会话中心，星团内部结构不动，带缓动。 */
      relayout() {
        if (!this.sessions.length) return
        const centers = this.sessionCenters(this.sessions, this.opts.layout)
        const prev = new Map()
        this.sessions.forEach((s, i) => {
          prev.set(s.id, { cx: s.cx, cy: s.cy, cz: s.cz })
          s.tx = centers[i].x
          s.ty = centers[i].y
          s.tz = centers[i].z
        })
        this.morph = { t: 0, prev }
        this.brainLines = this.opts.layout === 'brain' ? this.makeBrainLines() : null
      }

      makeBrainLines() {
        const lines = []
        const lat = (half, lane, phiB, thetaB, a) => {
          const sx = half === 0 ? -1 : 1
          const wob = 1 + 0.09 * Math.sin(phiB * 3.2 + lane * 2.1)
          const px = Math.sin(phiB) * Math.cos(thetaB)
          const py = Math.cos(phiB)
          const pz = Math.sin(phiB) * Math.sin(thetaB)
          return {
            x: sx * (0.38 + 0.62 * Math.abs(px)) * 9.6 * wob,
            y: py * 8.4 * wob,
            z: pz * 5.4 * wob,
          }
        }
        for (let half = 0; half < 2; half += 1) {
          // 纵向脑回
          for (let lane = 0; lane < 6; lane += 1) {
            const pts = []
            for (let k = 0; k <= 22; k += 1) {
              const u = k / 22
              const phiB = Math.PI * (0.12 + 0.72 * u)
              const thetaB = (lane / 6) * Math.PI * 1.5 + 0.4 + u * 2.4
              pts.push(lat(half, lane, phiB, thetaB, 0.13))
            }
            lines.push({ pts, a: 0.075 })
          }
          // 横向脑回
          for (const wp of [0.32, 0.5, 0.68]) {
            const pts = []
            for (let k = 0; k <= 30; k += 1) {
              const thetaB = (k / 30) * TAU
              pts.push(lat(half, Math.round(wp * 10), Math.PI * wp, thetaB, 0.1))
            }
            lines.push({ pts, a: 0.075 })
          }
          // 外轮廓（正面经线，稍亮）
          const rim = []
          for (let k = 0; k <= 26; k += 1) {
            const u = k / 26
            rim.push(lat(half, 0, Math.PI * (0.08 + 0.84 * u), 0.02 + u * 0.05, 0.22))
          }
          lines.push({ pts: rim, a: 0.17 })
        }
        return lines
      }

      buildDust() {
        const k = clamp(Number(this.opts.dust) || 0, 0, 2)
        const out = []
        for (const s of this.sessions) {
          const dustN = Math.round(Math.min(70, 10 + (s.count || 0) * 5) * k)
          for (let d = 0; d < dustN; d += 1) {
            const t = Math.pow(Math.random(), 0.65)
            out.push({
              session: s,
              hue: s.hue,
              r: s.core * (0.1 + 0.92 * t),
              theta: (d % 2 === 0 ? 0 : Math.PI) + t * 4.6 + (Math.random() - 0.5) * 0.9,
              yy: (Math.random() - 0.5) * s.core * 0.3,
              a: 0.1 + Math.random() * 0.3,
              sz: 0.02 + Math.random() * 0.05,
              phase: Math.random() * TAU,
            })
          }
        }
        this.dust = out
      }

      reset() {
        this.rx = -0.3
        this.ry = 0.35
        this.targetZoom = 0.95
        this.selected = null
        this.highlight.clear()
      }

      setHighlight(ids) {
        this.highlight = new Set(ids || [])
      }

      setSelected(id) {
        this.selected = id || null
      }

      setOnSelect(fn) { this.onSelect = fn }
      setOnHover(fn) { this.onHover = fn }

      bind() {
        const c = this.canvas
        c.addEventListener('pointerdown', (e) => {
          this.dragging = true
          this.lastX = e.clientX
          this.lastY = e.clientY
          this.moved = 0
          c.setPointerCapture?.(e.pointerId)
        })
        c.addEventListener('pointermove', (e) => {
          if (this.dragging) {
            const dx = e.clientX - this.lastX
            const dy = e.clientY - this.lastY
            this.lastX = e.clientX
            this.lastY = e.clientY
            this.moved += Math.abs(dx) + Math.abs(dy)
            this.ry += dx * 0.006
            this.rx = clamp(this.rx + dy * 0.006, -1.35, 1.35)
            this.velX = dx * 0.006
            this.velY = dy * 0.006
            return
          }
          const hit = this.pick(e.clientX, e.clientY)
          if (hit !== this.hover) {
            this.hover = hit
            c.style.cursor = hit ? 'pointer' : 'grab'
            if (this.onHover) this.onHover(hit)
          }
        })
        const up = () => { this.dragging = false }
        c.addEventListener('pointerup', up)
        c.addEventListener('pointercancel', up)
        c.addEventListener('pointerleave', () => { this.dragging = false })
        c.addEventListener('click', (e) => {
          if (this.moved > 6) return
          const hit = this.pick(e.clientX, e.clientY)
          if (this.onSelect) this.onSelect(hit)
        })
        c.addEventListener('dblclick', () => { this.rx = -0.3; this.ry = 0.35; this.targetZoom = 0.95 })
        c.addEventListener('wheel', (e) => {
          e.preventDefault()
          this.targetZoom = clamp(this.targetZoom * Math.exp(-e.deltaY * 0.0012), 0.3, 2.5)
        }, { passive: false })
      }

      camera() {
        const cx = Math.cos(this.rx), sx = Math.sin(this.rx)
        const cy = Math.cos(this.ry), sy = Math.sin(this.ry)
        return { cx, sx, cy, sy }
      }

      project(p, cam) {
        const { cx, sx, cy, sy } = cam
        const x1 = p.x * cy + p.z * sy
        const z1 = -p.x * sy + p.z * cy
        const y2 = p.y * cx - z1 * sx
        const z2 = p.y * sx + z1 * cx
        const distance = 30 / Math.max(0.25, this.zoom)
        const depth = z2 + distance
        if (depth < 1.5) return null
        const scale = (Math.min(this.w, this.h) * 0.95) / depth
        return {
          x: this.w / 2 + x1 * scale,
          y: this.h / 2 + y2 * scale,
          s: scale,
          depth,
          z: z2,
        }
      }

      sprite(hue, size) {
        const key = hue + ':' + size
        if (this.sprites.has(key)) return this.sprites.get(key)
        const c = document.createElement('canvas')
        c.width = size
        c.height = size
        const g = c.getContext('2d')
        const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
        grad.addColorStop(0, 'rgba(255,255,255,0.82)')
        grad.addColorStop(0.18, hueColor(hue, 82, 0.95))
        grad.addColorStop(0.44, hueColor(hue, 60, 0.32))
        grad.addColorStop(1, hueColor(hue, 55, 0))
        g.fillStyle = grad
        g.fillRect(0, 0, size, size)
        this.sprites.set(key, c)
        return c
      }

      pick(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect()
        const x = clientX - rect.left
        const y = clientY - rect.top
        const cam = this.camera()
        let best = null
        let bestD = 20
        for (const node of this.nodes) {
          const p = this.nodeWorld(node)
          const pr = this.project(p, cam)
          if (!pr) continue
          const d = Math.hypot(pr.x - x, pr.y - y)
          if (d < bestD) { bestD = d; best = node }
        }
        return best
      }

      dustWorld(d) {
        const t = this.spin * (0.55 / (0.45 + d.r))
        const a = d.theta + t
        const s = d.session
        return {
          x: s.cx + Math.cos(a) * d.r,
          y: s.cy + d.yy,
          z: s.cz + Math.sin(a) * d.r,
        }
      }

      nodeWorld(node) {
        const t = this.spin * (0.55 / (0.45 + node.r))
        const a = node.theta + t
        const s = node.session
        return {
          x: s.cx + Math.cos(a) * node.r,
          y: s.cy + node.yy,
          z: s.cz + Math.sin(a) * node.r,
        }
      }

      loop() {
        if (!this.alive) return
        this.frame += 1
        this.spin += 0.0035 * (this.opts.spin || 0)
        this.zoom += (this.targetZoom - this.zoom) * 0.1
        if (!this.dragging) {
          this.ry += this.velX
          this.rx = clamp(this.rx + this.velY, -1.35, 1.35)
          this.velX *= 0.92
          this.velY *= 0.92
        }
        try { this.draw() } catch (err) { console.error('[记忆星穹]', err) }
        requestAnimationFrame(() => this.loop())
      }

      draw() {
        const { ctx } = this
        const w = this.w
        const h = this.h
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)

        const opt = this.opts
        const tone = hexToRgb(opt.bg)
        const hasPhoto = Boolean(this.bgImg && this.bgImg.complete && this.bgImg.naturalWidth > 0)
        if (hasPhoto) {
          const iw = this.bgImg.naturalWidth
          const ih = this.bgImg.naturalHeight
          const k = Math.max(w / iw, h / ih)
          const dw = iw * k
          const dh = ih * k
          ctx.globalAlpha = 0.96
          ctx.drawImage(this.bgImg, (w - dw) / 2, (h - dh) / 2, dw, dh)
          ctx.globalAlpha = 1
          ctx.fillStyle = 'rgba(2,4,8,0.3)'
          ctx.fillRect(0, 0, w, h)
        }
        const alpha = hasPhoto
          ? 0.12 + 0.5 * clamp(opt.veil, 0.15, 1)
          : 0.32 + 0.68 * clamp(opt.veil, 0.15, 1)
        const bg = ctx.createRadialGradient(w * 0.5, h * 0.46, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.78)
        bg.addColorStop(0, 'rgba(' + tone.r + ',' + tone.g + ',' + tone.b + ',' + alpha.toFixed(3) + ')')
        bg.addColorStop(0.55, 'rgba(' + Math.round(tone.r * 0.62) + ',' + Math.round(tone.g * 0.62) + ',' + Math.round(tone.b * 0.62) + ',' + (alpha * 0.92).toFixed(3) + ')')
        bg.addColorStop(1, 'rgba(0,0,0,' + (alpha * 0.96).toFixed(3) + ')')
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, w, h)

        if (this.morph) {
          this.morph.t = Math.min(1, this.morph.t + 0.035)
          const k = 1 - Math.pow(1 - this.morph.t, 3)
          for (const s of this.sessions) {
            const p = this.morph.prev.get(s.id)
            if (!p) continue
            s.cx = p.cx + (s.tx - p.cx) * k
            s.cy = p.cy + (s.ty - p.cy) * k
            s.cz = p.cz + (s.tz - p.cz) * k
          }
          if (this.morph.t >= 1) this.morph = null
        }

        const cam = this.camera()
        const t = this.frame / 60

        // 背景星尘：随相机轻微视差
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (const star of this.stars) {
          const p = this.project({ x: star.x, y: star.y, z: star.z }, cam)
          if (!p) continue
          const a = star.a * clamp(1 - p.depth / 110, 0.1, 1) * (opt.star || 1)
          ctx.fillStyle = 'rgba(180,210,255,' + a.toFixed(3) + ')'
          const r = star.s * clamp(1.4 - p.depth / 110, 0.25, 1.4)
          ctx.fillRect(p.x, p.y, r, r)
        }
        ctx.restore()

        // 大脑布局的沟回线（很淡，只做轮廓暗示）
        if (this.opts.layout === 'brain' && this.brainLines) {
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.lineWidth = 1
          for (const line of this.brainLines) {
            ctx.strokeStyle = 'rgba(130,205,255,' + line.a + ')'
            ctx.beginPath()
            let started = false
            for (const pt of line.pts) {
              const p = this.project(pt, cam)
              if (!p) { started = false; continue }
              if (!started) { ctx.moveTo(p.x, p.y); started = true } else ctx.lineTo(p.x, p.y)
            }
            ctx.stroke()
          }
          ctx.restore()
        }

        // 星系核
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const showNames = this.opts.names
        const sessionScreen = []
        for (const c of this.clusters || []) {
          const p = this.project(c, cam)
          if (!p) continue
          const haze = clamp(2.4 * p.s * 3.0, 90, 420)
          ctx.globalAlpha = 0.022
          ctx.drawImage(this.sprite(c.hue, 128), p.x - haze / 2, p.y - haze / 2, haze, haze)
        }
        ctx.globalAlpha = 1
        for (const s of this.sessions) {
          const c = this.project({ x: s.cx, y: s.cy, z: s.cz }, cam)
          if (!c) continue
          sessionScreen.push({ s, c })
          const core = this.sprite(this.hue(s.hue), 128)
          const bs = Number(this.opts.breath ?? 1)
          const wave = Math.sin(t * 1.05 + s.hue * 0.35)
          const beat = 1 + 0.13 * bs * wave
          const size = clamp(s.core * c.s * 2.4 * beat, 14, 130)
          ctx.globalAlpha = 0.5 * (0.82 + 0.22 * bs * wave)
          ctx.drawImage(core, c.x - size / 2, c.y - size / 2, size, size)
          const mist = clamp(s.core * c.s * 7.5, 30, 420)
          ctx.globalAlpha = 0.075
          ctx.drawImage(core, c.x - mist / 2, c.y - mist / 2, mist, mist)
          ctx.globalAlpha = 1
        }
        ctx.restore()

        // 节点投影
        const projected = []
        for (const node of this.nodes) {
          const p = this.project(this.nodeWorld(node), cam)
          if (!p) continue
          const bs = Number(this.opts.breath ?? 1)
          const wave = Math.sin(t * 1.35 + node.index * 0.62)
          const pulse = 1 + 0.2 * bs * wave
          const flicker = 0.8 + 0.2 * bs * Math.sin(t * 1.35 + node.index * 0.62 + 1.1)
          projected.push({ node, p, pulse, flicker })
        }
        projected.sort((a, b) => b.p.depth - a.p.depth)

        const hasHighlight = this.highlight.size > 0
        const dim = (node) => (hasHighlight && !this.highlight.has(node.id) && node.id !== this.selected ? 0.16 : 1)

        // 连线
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.lineWidth = 0.7
        for (const link of this.links) {
          const pa = this.project(this.nodeWorld(link.a), cam)
          const pb = this.project(this.nodeWorld(link.b), cam)
          if (!pa || !pb) continue
          const lit = hasHighlight && (this.highlight.has(link.a.id) || this.highlight.has(link.b.id))
          const base = link.chain ? 0.05 : 0.075
          const alpha = (lit ? 0.34 : base) * clamp(1 - Math.min(pa.depth, pb.depth) / 60, 0.2, 1) * (this.opts.link || 1)
          ctx.strokeStyle = lit ? 'rgba(160,225,255,' + alpha + ')' : 'rgba(110,175,235,' + alpha + ')'
          ctx.beginPath()
          ctx.moveTo(pa.x, pa.y)
          ctx.lineTo(pb.x, pb.y)
          ctx.stroke()
        }
        ctx.restore()

        // 旋臂尘埃
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (const d of this.dust || []) {
          const p = this.project(this.dustWorld(d), cam)
          if (!p) continue
          const sz = clamp(d.sz * p.s * 26, 1, 7)
          const bs = Number(this.opts.breath ?? 1)
          const breathe = 0.72 + 0.28 * bs * Math.sin(t * 1.1 + (d.phase || 0))
          ctx.globalAlpha = d.a * clamp(1.1 - p.depth / 90, 0.2, 1) * (hasHighlight ? 0.35 : 1) * clamp(breathe, 0.4, 1.3)
          ctx.drawImage(this.sprite(this.hue(d.hue), 32), p.x - sz / 2, p.y - sz / 2, sz, sz)
        }
        ctx.restore()

        // 节点
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (const { node, p, pulse, flicker } of projected) {
          const size = clamp((0.24 + node.importance * 0.46) * p.s * (this.opts.nodeScale || 1), 4, 48) * pulse
          const sp = this.sprite(this.hue(node.hue), 96)
          ctx.globalAlpha = dim(node) * clamp(1.1 - p.depth / 90, 0.3, 1) *
            clamp(0.6 + 0.4 * (this.opts.star || 1), 0.6, 1.4) * clamp(flicker, 0.55, 1.35)
          if (node.id === this.selected) {
            ctx.globalAlpha = 1
            const ring = this.sprite(this.hue(node.hue), 128)
            const rs = size * 3.4
            ctx.drawImage(ring, p.x - rs / 2, p.y - rs / 2, rs, rs)
          }
          ctx.drawImage(sp, p.x - size / 2, p.y - size / 2, size, size)
        }
        ctx.restore()

        // 搜索命中脉冲环
        if (hasHighlight) {
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          const phase = (t * 1.2) % 1
          for (const { node, p } of projected) {
            if (!this.highlight.has(node.id)) continue
            ctx.strokeStyle = hueColor(this.hue(node.hue), 80, (1 - phase) * 0.7)
            ctx.lineWidth = 1.4
            ctx.beginPath()
            ctx.arc(p.x, p.y, 6 + phase * 22, 0, TAU)
            ctx.stroke()
          }
          ctx.restore()
        }

        // 流星：小光球 + 逐渐消散的拖尾
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        const meteorList = this.opts.meteors ? this.meteors : []
        for (const m of meteorList) {
          m.t += 0.0029 * (0.45 + m.speed)
          if (m.t > 1.3) {
            m.t = 0
            if (this.links.length) m.link = this.links[Math.floor(Math.random() * this.links.length)]
          }
          const wa = this.nodeWorld(m.link.a)
          const wb = this.nodeWorld(m.link.b)
          const tt = clamp(m.t, 0, 1)
          const fade = Math.min(1, tt / 0.06) * Math.min(1, (1 - tt) / 0.08)
          if (fade <= 0.01) continue
          const hue = this.hue(m.link.a.hue)
          const head = this.project({
            x: wa.x + (wb.x - wa.x) * tt,
            y: wa.y + (wb.y - wa.y) * tt,
            z: wa.z + (wb.z - wa.z) * tt,
          }, cam)
          if (!head) continue
          const pulse = 0.85 + 0.3 * Math.sin(t * 9 + m.phase)
          const core = clamp(1.7 + 1.3 * fade, 1.3, 3.6) * pulse
          const halo = core * 6.5
          ctx.globalAlpha = fade * 0.4
          ctx.drawImage(this.sprite(hue, 64), head.x - halo / 2, head.y - halo / 2, halo, halo)
          ctx.globalAlpha = fade
          ctx.drawImage(this.sprite(hue, 24), head.x - core / 2, head.y - core / 2, core, core)
          const tailN = 18
          for (let k = 1; k <= tailN; k += 1) {
            const kk = k / tailN
            const tk = tt - kk * 0.15
            if (tk < 0) break
            const p = this.project({
              x: wa.x + (wb.x - wa.x) * tk,
              y: wa.y + (wb.y - wa.y) * tk,
              z: wa.z + (wb.z - wa.z) * tk,
            }, cam)
            if (!p) continue
            const sz = Math.max(1.2, core * (1 - kk) * 1.9)
            ctx.globalAlpha = fade * Math.pow(1 - kk, 1.5) * 0.4
            ctx.drawImage(this.sprite(hue, 32), p.x - sz / 2, p.y - sz / 2, sz, sz)
          }
        }
        ctx.restore()

        // 文字标签
        ctx.save()
        ctx.font = '11px -apple-system, "PingFang SC", sans-serif'
        ctx.textAlign = 'center'
        for (const { s, c } of sessionScreen) {
          if (!showNames && this.hover?.session !== s && this.selected !== s.id) continue
          const alpha = clamp(1 - c.depth / 70, 0.2, 0.9)
          ctx.fillStyle = 'rgba(170,215,255,' + alpha.toFixed(2) + ')'
          ctx.fillText(s.title.slice(0, 12), c.x, c.y - 10)
        }
        if (this.hover) {
          const p = this.project(this.nodeWorld(this.hover), cam)
          if (p) {
            const node = this.hover
            ctx.textAlign = 'left'
            ctx.fillStyle = 'rgba(230,245,255,.92)'
            ctx.fillText(node.text.slice(0, 22), p.x + 12, p.y - 8)
            if (node.tags.length) {
              ctx.fillStyle = 'rgba(130,190,240,.7)'
              ctx.fillText(node.tags.slice(0, 3).map((x) => '#' + x).join(' '), p.x + 12, p.y + 6)
            }
          }
        }
        ctx.restore()

        this.sessionScreen = sessionScreen
      }

      destroy() {
        this.alive = false
      }
    }

    /* ============================================================== 组件 ==== */

    function Icon(props) {
      return h('svg', {
        width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true,
        style: props?.style,
      },
        h('circle', { cx: 12, cy: 12, r: 2.1, fill: 'currentColor' }),
        h('path', { d: 'M12 2.6v4.2M12 17.2v4.2M2.6 12h4.2M17.2 12h4.2', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
        h('path', { d: 'M5.4 5.4l2.9 2.9M15.7 15.7l2.9 2.9M18.6 5.4l-2.9 2.9M8.3 15.7l-2.9 2.9', stroke: 'currentColor', strokeWidth: 1.1, strokeLinecap: 'round', opacity: 0.55 }),
        h('circle', { cx: 5.1, cy: 12, r: 0.9, fill: 'currentColor', opacity: 0.7 }),
        h('circle', { cx: 18.9, cy: 12, r: 0.7, fill: 'currentColor', opacity: 0.5 }),
      )
    }

    async function api(path, opts) {
      const options = Object.assign({ credentials: 'same-origin' }, opts || {})
      const headers = Object.assign({}, options.headers || {})
      if (TOKEN) headers['x-mn-token'] = TOKEN
      options.headers = headers
      const res = await fetch(API + path, options)
      const json = await res.json().catch(() => null)
      if (!json) throw new Error('宿主没有返回 JSON（HTTP ' + res.status + '）')
      if (!json.ok) throw new Error(json.error || ('HTTP ' + res.status))
      return json
    }

    function formatTime(ms) {
      if (!ms) return ''
      const d = new Date(Number(ms))
      const p = (n) => String(n).padStart(2, '0')
      return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    }

    function App() {
      const [graph, setGraph] = useState(null)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState('')
      const [query, setQuery] = useState('')
      const [selected, setSelected] = useState(null)
      const [detail, setDetail] = useState(null)
      const [detailLoading, setDetailLoading] = useState(false)
      const [hover, setHover] = useState(null)
      const [rebuilding, setRebuilding] = useState(false)
      const [settings, setSettings] = useState(loadSettings)
      const [settingsOpen, setSettingsOpen] = useState(false)
      const [newCount, setNewCount] = useState(0)
      const totalRef = useRef(null)
      const [showRaw, setShowRaw] = useState(false)
      const [sortBy, setSortBy] = useState('important')
      const [activePara, setActivePara] = useState(-1)
      const paraRefs = useRef({})
      const bgUrlRef = useRef(null)
      const hitTimer = useRef(null)
      const canvasRef = useRef(null)
      const engineRef = useRef(null)
      const stageRef = useRef(null)
      const tipRef = useRef(null)

      async function load() {
        setLoading(true)
        try {
          const g = await api('/graph')
          setGraph(g)
          setError('')
          setNewCount(0)
          totalRef.current = null
        } catch (err) {
          setError(err.message || '加载失败')
        } finally {
          setLoading(false)
        }
      }

      useEffect(() => { load() }, [])

      useEffect(() => {
        const timer = setInterval(async () => {
          try {
            const st = await api('/status')
            const total = Number(st.memories) || 0
            if (totalRef.current === null) { totalRef.current = total; return }
            if (total > totalRef.current) setNewCount(total - totalRef.current)
            totalRef.current = total
          } catch { /* 轮询失败静默 */ }
        }, 60000)
        return () => clearInterval(timer)
      }, [])

      const viewGraph = useMemo(() => filterGraph(graph, settings), [graph, settings.workspaces, settings.limit])

      const workspaceList = useMemo(() => {
        const map = new Map()
        for (const s of graph?.sessions || []) {
          const cwd = s.cwd || ''
          if (!map.has(cwd)) {
            map.set(cwd, { cwd, name: cwd.split('/').filter(Boolean).pop() || '未分组', memories: 0 })
          }
          map.get(cwd).memories += s.count || 0
        }
        return [...map.values()].sort((a, b) => b.memories - a.memories)
      }, [graph])

      useEffect(() => {
        if (!canvasRef.current) return undefined
        const engine = new Nebula(canvasRef.current)
        engine.setOptions(settings)
        engineRef.current = engine
        engine.setOnSelect((node) => setSelected(node))
        engine.setOnHover((node) => {
          setHover(node)
          const tip = tipRef.current
          if (!tip) return
          if (!node) { tip.style.display = 'none'; return }
          tip.style.display = 'block'
          tip.textContent = node.text.slice(0, 60)
        })
        const ro = new ResizeObserver(() => engine.resize())
        if (stageRef.current) ro.observe(stageRef.current)
        return () => { ro.disconnect(); engine.destroy() }
      }, [])

      useEffect(() => {
        if (!engineRef.current || !viewGraph) return
        engineRef.current.setData(viewGraph)
      }, [viewGraph])

      useEffect(() => {
        saveSettings(settings)
        if (engineRef.current) engineRef.current.setOptions(settings)
      }, [settings])

      const results = useMemo(() => {
        if (!graph) return []
        const q = query.trim().toLowerCase()
        if (!q) return []
        const parts = q.split(/\s+/).filter(Boolean)
        return graph.nodes
          .map((n) => {
            const hay = (n.text + ' ' + n.tags.join(' ')).toLowerCase()
            let score = 0
            for (const p of parts) {
              if (hay.includes(p)) score += 1
              if (n.tags.includes(p)) score += 2
            }
            return { n, score }
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map((x) => x.n)
      }, [query, graph])

      useEffect(() => {
        if (!engineRef.current) return
        engineRef.current.setHighlight(results.map((n) => n.id))
        if (query.trim()) setSelected(null)
      }, [results])

      useEffect(() => {
        setShowRaw(false)
        setActivePara(-1)
        paraRefs.current = {}
      }, [selected?.id])

      useEffect(() => {
        if (!engineRef.current) return
        engineRef.current.setSelected(selected?.id || null)
        if (!selected) { setDetail(null); return }
        setDetailLoading(true)
        api('/memory?id=' + encodeURIComponent(selected.id))
          .then((d) => setDetail(d))
          .catch((err) => setDetail({ text: '读不到详情：' + err.message }))
          .finally(() => setDetailLoading(false))
      }, [selected?.id])

      async function rebuild() {
        setRebuilding(true)
        try {
          await api('/rebuild', { method: 'POST' })
          await load()
        } catch (err) {
          setError(err.message)
        } finally {
          setRebuilding(false)
        }
      }

      async function onPickBackground(e) {
        const file = e.target.files && e.target.files[0]
        e.target.value = ''
        if (!file) return
        try {
          const dataUrl = await compressImage(file, 1600)
          patch({ bgImage: dataUrl })
        } catch (err) {
          setError('图片读取失败：' + (err && err.message ? err.message : err))
        }
      }

      function jumpTo(i) {
        const el = paraRefs.current[i]
        if (!el) return
        try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch { el.scrollIntoView() }
        setActivePara(i)
        if (hitTimer.current) clearTimeout(hitTimer.current)
        hitTimer.current = setTimeout(() => setActivePara(-1), 1800)
      }

      function focusNode(node) {
        setSelected(node)
      }

      const parsed = detail ? parseMemoryText(detail.text) : { user: '', assistant: '' }
      const asstParts = String(parsed.assistant || '').split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)
      const keyParts = pickKeyParts(parsed.assistant, 4)
      const summary = {
        title: clipText(stripMd(parsed.user), 64),
        body: clipText(stripMd(parsed.assistant), 150),
      }
      const stats = viewGraph?.stats || {}
      const nodes = viewGraph?.nodes || []
      const q = query.trim()
      const sideOpen = Boolean(settings.side)
      const patch = (kv) => setSettings((v) => ({ ...v, ...kv }))
      const rangeRow = (label, key, min, max, step, fmt) => h('div', { className: 'mn-row' },
        h('span', null, label),
        h('input', {
          type: 'range', min, max, step, value: settings[key],
          onChange: (e) => patch({ [key]: Number(e.target.value) }),
        }),
        h('b', { className: 'val' }, fmt ? fmt(settings[key]) : Math.round(settings[key] * 100) + '%')
      )
      const switchRow = (label, key) => h('div', { className: 'mn-row' },
        h('span', null, label),
        h('button', {
          className: 'mn-sw' + (settings[key] ? ' on' : ''),
          onClick: () => patch({ [key]: !settings[key] }),
        })
      )

      return h('div', {
        className: 'mn-root',
        style: { '--mn-veil': String(0.55 + 0.45 * settings.veil) },
      },
        h('div', { className: 'mn-head' },
          h('div', { className: 'mn-title' }, '记忆', h('b', null, '星穹')),
          h('div', { className: 'mn-sub' }, 'MEMORY NEBULA'),
          h('button', {
            className: 'mn-btn' + (sideOpen ? ' on' : ''),
            onClick: () => patch({ side: !sideOpen }),
            title: '收起 / 展开记忆列表',
            style: { height: 28, padding: '0 10px', marginLeft: 8 },
          }, sideOpen ? '⟨ 列表' : '⟩ 列表'),
          h('div', { className: 'mn-stats' },
            h('span', null, h('i', null, stats.memories ?? nodes.length), '记忆'),
            h('span', null, h('i', null, stats.sessions ?? graph?.sessions?.length ?? 0), '会话'),
            h('span', null, h('i', null, stats.tags ?? 0), '标签'),
            graph?.builtAt ? h('span', { style: { opacity: 0.6 } }, '更新于 ' + formatTime(graph.builtAt)) : null
          ),
          newCount > 0 ? h('button', {
            className: 'mn-btn on',
            onClick: () => { load() },
            title: '索引里有新记忆，点击刷新星图',
            style: { height: 28, padding: '0 10px' },
          }, '↑ ' + newCount + ' 条新记忆') : null,
          h('button', {
            className: 'mn-btn' + (settingsOpen ? ' on' : ''),
            onClick: () => setSettingsOpen((v) => !v),
            style: { height: 28, padding: '0 10px' },
            title: '外观设置',
          }, '⚙ 设置')
        ),
        h('div', { className: 'mn-body' },
          h('div', { className: 'mn-side' + (sideOpen ? '' : ' closed') },
            h('div', { className: 'mn-search' },
              h('input', {
                className: 'mn-input',
                placeholder: '搜索记忆、关键词…',
                value: query,
                onChange: (e) => setQuery(e.target.value),
              }),
              h('button', { className: 'mn-btn', onClick: rebuild, disabled: rebuilding, title: '重新扫描会话' },
                rebuilding ? '扫描中' : '重建')
            ),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('button', { className: 'mn-btn' + (settings.names ? ' on' : ''), onClick: () => patch({ names: !settings.names }), style: { flex: 1 } },
                settings.names ? '隐藏会话名' : '显示会话名'),
              h('button', { className: 'mn-btn', onClick: () => { setQuery(''); setSelected(null); engineRef.current?.reset?.() }, style: { flex: 1 } }, '复位')
            ),
            h('div', { className: 'mn-sort' },
              h('span', { className: 'lbl' }, '排序'),
              h('button', { className: 'mn-chip' + (sortBy === 'important' ? ' on' : ''), onClick: () => setSortBy('important') }, '重要'),
              h('button', { className: 'mn-chip' + (sortBy === 'recent' ? ' on' : ''), onClick: () => setSortBy('recent') }, '最新')
            ),
            h('div', { className: 'mn-list' },
              error ? h('div', { className: 'mn-empty' }, error) : null,
              loading ? h('div', { className: 'mn-empty' }, h('span', { className: 'mn-spin' }), '正在铺开星空…') : null,
              !loading && !nodes.length && !error
                ? h('div', { className: 'mn-empty' }, '还没有记忆。聊几句，然后点「重建」。')
                : null,
              q && !results.length ? h('div', { className: 'mn-empty' }, '没有命中「' + q + '」的记忆。') : null,
              (q
                ? results
                : nodes.slice()
                  .sort(sortBy === 'recent' ? (a, b) => b.time - a.time : (a, b) => b.importance - a.importance)
                  .slice(0, 30)
              ).map((n) => {
                const on = selected?.id === n.id
                return h('div', {
                  key: n.id,
                  className: 'mn-item' + (on ? ' on' : ''),
                  onClick: () => focusNode(n),
                  onMouseEnter: () => { const e = engineRef.current; if (e) e.hover = e.nodes.find((x) => x.id === n.id) || null },
                  onMouseLeave: () => { const e = engineRef.current; if (e) e.hover = null },
                },
                  h('div', { className: 'mn-meta' },
                    h('span', null, n.date),
                    h('b', null, sessionTitle(viewGraph, n.sid)),
                    n.manual ? h('span', { className: 'mn-tag', style: { color: '#ffd479', borderColor: 'rgba(255,200,90,.3)' } }, '手记') : null
                  ),
                  h('div', { className: 'mn-snippet' }, n.text || '（空）'),
                  n.tags.length ? h('div', { style: { marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' } },
                    n.tags.slice(0, 3).map((t) => h('span', { key: t, className: 'mn-tag' }, '#' + t))) : null
                )
              })
            )
          ),
          h('div', { className: 'mn-stage', ref: stageRef },
            h('canvas', { className: 'mn-canvas', ref: canvasRef, style: { touchAction: 'none' } }),
            h('div', { className: 'mn-hint' }, '拖动旋转 · 滚轮缩放 · 点击星星看全文 · 双击复位'),
            h('div', { className: 'mn-tip', ref: tipRef }),
          )
        ),
        settingsOpen ? h('div', { className: 'mn-settings' },
          h('button', { className: 'close', onClick: () => setSettingsOpen(false) }, '×'),
          h('h4', null, '外观设置'),

          h('div', { className: 'mn-group' }, '数据范围'),
          h('div', { className: 'mn-chips' },
            h('button', {
              className: 'mn-chip' + (!settings.workspaces.length ? ' on' : ''),
              onClick: () => patch({ workspaces: [] }),
            }, '全部工作区'),
            workspaceList.map((w) => {
              const on = settings.workspaces.includes(w.cwd)
              return h('button', {
                key: w.cwd,
                title: w.cwd,
                className: 'mn-chip' + (on ? ' on' : ''),
                onClick: () => {
                  const cur = settings.workspaces
                  const next = cur.includes(w.cwd) ? cur.filter((c) => c !== w.cwd) : [...cur, w.cwd]
                  patch({ workspaces: next })
                },
              }, w.name + ' · ' + w.memories)
            })
          ),
          h('div', { className: 'mn-row' },
            h('span', null, '记忆上限'),
            h('div', { className: 'mn-chips', style: { margin: 0, flex: 1 } },
              [0, 500, 200, 100, 50].map((n) => h('button', {
                key: n,
                className: 'mn-chip' + (Number(settings.limit) === n ? ' on' : ''),
                onClick: () => patch({ limit: n }),
              }, n === 0 ? '全部' : String(n)))
            )
          ),

          h('div', { className: 'mn-group' }, '主 题'),
          h('div', { className: 'mn-swatches', style: { margin: '4px 0 2px 0' } },
            THEMES.map((t) => h('i', {
              key: t.id,
              title: t.name,
              className: 'mn-swatch' + (settings.theme === t.id ? ' on' : ''),
              style: { background: t.bg },
              onClick: () => patch({ theme: t.id, bg: t.bg }),
            }))
          ),
          h('div', { className: 'mn-row' },
            h('span', null, '自定义底色'),
            h('input', { type: 'color', value: settings.bg, onChange: (e) => patch({ bg: e.target.value }) })
          ),
          h('div', { className: 'mn-row' },
            h('span', null, '背景图片'),
            settings.bgImage ? h('i', { className: 'mn-thumb', style: { backgroundImage: 'url(' + settings.bgImage + ')' } }) : null,
            h('label', { className: 'mn-chip', style: { marginLeft: settings.bgImage ? 0 : 'auto' } },
              '选择图片',
              h('input', {
                type: 'file', accept: 'image/*', style: { display: 'none' },
                onChange: onPickBackground,
              })
            ),
            settings.bgImage ? h('button', {
              className: 'mn-chip',
              onClick: () => { patch({ bgImage: '' }); if (bgUrlRef.current) bgUrlRef.current.value = '' },
            }, '清除') : null
          ),
          h('div', { className: 'mn-row' },
            h('span', null, '图片链接'),
            h('input', {
              ref: bgUrlRef,
              className: 'mn-text',
              placeholder: '粘贴 https:// 图片地址后回车',
              defaultValue: settings.bgImage && settings.bgImage.indexOf('data:') !== 0 ? settings.bgImage : '',
              onKeyDown: (e) => { if (e.key === 'Enter') patch({ bgImage: e.currentTarget.value.trim() }) },
              onBlur: (e) => { const v = e.currentTarget.value.trim(); if (v !== settings.bgImage) patch({ bgImage: v }) },
            })
          ),
          rangeRow('背景不透明度', 'veil', 0.2, 1, 0.01),

          h('div', { className: 'mn-group' }, '排 布'),
          h('div', { className: 'mn-chips' },
            LAYOUTS.map((l) => h('button', {
              key: l.id,
              className: 'mn-chip' + (settings.layout === l.id ? ' on' : ''),
              onClick: () => patch({ layout: l.id }),
            }, l.name))
          ),

          h('div', { className: 'mn-group' }, '星 图'),
          rangeRow('星点亮度', 'star', 0.3, 1.8, 0.05),
          rangeRow('节点大小', 'nodeScale', 0.5, 2, 0.05),
          rangeRow('粒子密度', 'dust', 0, 2, 0.05),
          rangeRow('连线亮度', 'link', 0.2, 2, 0.05),
          rangeRow('自转速度', 'spin', 0, 3, 0.05, (v) => Number(v).toFixed(2) + '×'),
          rangeRow('呼吸强度', 'breath', 0, 2, 0.05),
          switchRow('流星', 'meteors'),
          switchRow('会话名', 'names'),

          h('div', { className: 'mn-group' }, '称 呼'),
          h('div', { className: 'mn-row' },
            h('span', null, '我的名字'),
            h('input', {
              className: 'mn-text', value: settings.userName, maxLength: 12,
              placeholder: '你',
              onChange: (e) => patch({ userName: e.target.value }),
            })
          ),
          h('div', { className: 'mn-row' },
            h('span', null, '助手名字'),
            h('input', {
              className: 'mn-text', value: settings.botName, maxLength: 12,
              placeholder: '助手',
              onChange: (e) => patch({ botName: e.target.value }),
            })
          ),

          h('div', { className: 'mn-group' }, '面 板'),
          switchRow('左侧记忆列表', 'side'),
          h('div', { className: 'foot' },
            h('button', { className: 'mn-btn', onClick: () => setSettings({ ...DEFAULT_SETTINGS }) }, '恢复默认'),
            h('button', { className: 'mn-btn', onClick: () => setSettingsOpen(false) }, '完成')
          )
        ) : null,
        detail ? h('div', { className: 'mn-detail' },
          h('button', { className: 'close', onClick: () => setSelected(null) }, '×'),
          h('h4', null, selected?.manual ? '手写记忆' : '记忆详情'),
          h('div', { className: 'dt' },
            (detail.date || selected?.date || '') + ' · ' + (detail.session || sessionTitle(viewGraph, selected?.sid) || '') +
            (selected?.importance ? ' · 亮度 ' + selected.importance : '')),

          detailLoading ? h('div', { className: 'txt' }, '读取中…') : h('div', null,
            h('div', { className: 'mn-summary' },
              h('div', { className: 's-label' }, '摘 要'),
              h('div', { className: 's-title' }, summary.title || '（这条没有' + (settings.userName || '你') + '的发言）'),
              summary.body ? h('div', { className: 's-body' }, summary.body) : null,
              h('div', { className: 's-meta' },
                (parsed.user.length + parsed.assistant.length) + ' 字' +
                ((detail.tags || selected?.tags || []).length ? ' · ' + (detail.tags || selected?.tags || []).length + ' 个标签' : ''))
            ),

            keyParts.length ? h('div', { className: 'mn-keynav' },
              keyParts.map((k) => h('button', {
                key: k.i,
                className: 'mn-keychip',
                onClick: () => jumpTo(k.i),
              }, '¶ ' + clipText(stripMd(k.p), 16)))
            ) : null,

            h('div', { className: 'mn-chat' },
              parsed.user ? h('div', { className: 'mn-msg user' },
                h('div', { className: 'who' }, settings.userName || '你'),
                h('div', { className: 'mn-bubble' }, stripMd(parsed.user))
              ) : null,
              parsed.assistant ? h('div', { className: 'mn-msg bot' },
                h('div', { className: 'who' }, settings.botName || '助手'),
                h('div', { className: 'mn-bubble' },
                  asstParts.length
                    ? asstParts.map((part, i) => h('div', {
                      key: i,
                      ref: (el) => { paraRefs.current[i] = el },
                      className: 'mn-para' + (activePara === i ? ' hit' : ''),
                    }, stripMd(part)))
                    : stripMd(parsed.assistant)
                )
              ) : h('div', { className: 'mn-msg bot' },
                h('div', { className: 'who' }, settings.botName || '助手'),
                h('div', { className: 'mn-bubble', style: { opacity: 0.5 } },
                  selected?.manual ? '（这条是你亲手记下的，没有助手回复）' : '（这一轮没有助手回复）')
              )
            ),

            h('div', { style: { marginTop: 12, display: 'flex', gap: 5, flexWrap: 'wrap' } },
              (detail.tags || selected?.tags || []).map((t) => h('span', { key: t, className: 'mn-tag' }, '#' + t))),

            h('div', { style: { marginTop: 12 } },
              h('button', { className: 'mn-btn', onClick: () => setShowRaw((v) => !v) }, showRaw ? '回到对话' : '查看原文')),

            showRaw ? h('div', { className: 'txt', style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(120,190,255,.12)' } }, detail.text) : null
          )
        ) : null
      )
    }

    function stripMd(v) {
      return String(v || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[*_`#>]/g, '')
        .replace(/\n{2,}/g, '\n')
        .trim()
    }

    function clipText(v, n) {
      const t = String(v || '').replace(/\s+/g, ' ').trim()
      return t.length > n ? t.slice(0, n) + '…' : t
    }

    /** Host 给的原文格式是【日期】用户：…\n\n助手：…，这里拆成两段对话。 */
    function parseMemoryText(text) {
      const src = String(text || '')
      const m = src.match(/^【[^】]*】\s*用户：\s*([\s\S]*?)(?:\n{2}助手：\s*([\s\S]*))?$/)
      if (!m) return { user: src.trim(), assistant: '' }
      return { user: (m[1] || '').trim(), assistant: (m[2] || '').trim() }
    }

    /** 从长回答里挑出最值得先看的几段。 */
    function pickKeyParts(text, max = 4) {
      const parts = String(text || '').split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)
      if (parts.length <= 1) return []
      const scored = parts.map((p, i) => {
        let score = 0
        if (/结论|总结|总之|关键|重点|因此|所以|核心|要点|建议/.test(p)) score += 3
        if (/^\d+[.、)]|^[-*•]\s/m.test(p)) score += 2
        if (/```|function |const |=>|npm |pip |package/.test(p)) score += 2
        if (p.length >= 35 && p.length <= 520) score += 1
        if (i === 0) score += 1.5
        if (i === parts.length - 1) score += 1
        return { i, p, score }
      })
      return scored.filter((x) => x.score >= 3).sort((a, b) => b.score - a.score).slice(0, max)
    }

    function filterGraph(g, conf) {
      if (!g) return g
      const ws = conf.workspaces || []
      let nodes = g.nodes || []
      if (ws.length) {
        const cwdOf = new Map((g.sessions || []).map((x) => [x.id, x.cwd || '']))
        nodes = nodes.filter((n) => ws.includes(cwdOf.get(n.sid) || ''))
      }
      if (conf.limit > 0 && nodes.length > conf.limit) {
        nodes = nodes.slice().sort((a, b) => b.time - a.time).slice(0, conf.limit)
      }
      const idSet = new Set(nodes.map((n) => n.id))
      const sidSet = new Set(nodes.map((n) => n.sid))
      const links = (g.links || []).filter((l) => idSet.has(l.source) && idSet.has(l.target))
      const sessions = (g.sessions || []).filter((x) => sidSet.has(x.id))
      const tags = new Set(nodes.flatMap((n) => n.tags || [])).size
      return {
        ...g,
        nodes,
        links,
        sessions,
        stats: { memories: nodes.length, sessions: sessions.length, tags, shown: nodes.length, links: links.length },
      }
    }

    function sessionTitle(graph, sid) {
      if (!graph) return ''
      const s = (graph.sessions || []).find((x) => x.id === sid)
      return s?.title || ''
    }

    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }

      static getDerivedStateFromError(error) {
        return { error }
      }

      componentDidCatch(error, info) {
        try { console.error('[记忆星穹] 面板崩溃', error, info) } catch { /* 忽略 */ }
      }

      render() {
        if (this.state.error) {
          return h('div', { className: 'mn-crash' },
            h('div', { className: 't' }, '记忆星穹遇到一个错误'),
            h('div', { className: 'b' }, String(this.state.error?.message || this.state.error || '未知错误')),
            h('button', { className: 'mn-btn', onClick: () => this.setState({ error: null }) }, '重试')
          )
        }
        return this.props.children
      }
    }

    function Panel() {
      return h('div', { style: { position: 'relative', width: '100%', height: '100%' } },
        h(ErrorBoundary, null, h(App)))
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ensureCss()
        const slots = ctx.slots || (typeof ctx.get === 'function' ? ctx.get('slots') : null)
        if (!slots) return
        slots.inject('sidebar.panellist', function () {
          return slots.register({ name: 'sidebar.panellist', id: 'memory-nebula', order: 18, label: function () { return '记忆星穹' } }, Icon)
        })
        slots.inject('main', function () {
          return slots.register({ name: 'main', key: 'memory-nebula' }, Panel)
        })
      },
    }
  },
})
