// Client-half smoke (dock float + merge panel): jsdom + real React + mock ctx
// + a fake /univer-api HTTP server. Covers: target discovery from the
// conversation snapshot → polling → draft floating window (live iframe deep
// link) → click-to-maximize / fold / drag / dismiss → ready + session end
// closes the window and embeds the merge panel → merged panel shows trunk.
//
//   node test/client-smoke.mjs
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
// jsdom/react/react-dom come from this repo's devDependencies.
const repoRequire = createRequire(import.meta.url)
const { JSDOM } = repoRequire('jsdom')

// ---- fake loopback API (node half's /univer-api) ----
const DEMO_FILE = join(tmpdir(), 'dsh-univer-client-smoke', 'demo.univer')
const SECOND_FILE = join(tmpdir(), 'dsh-univer-client-smoke', 'second.univer')
const WORKTREE = 'wt-msvqmweb-47hcdg'
const OPEN_URL = 'http://127.0.0.1:9123/?file=KEY&worktree=wt-msvqmweb-47hcdg'
const VIEW_URL = 'http://127.0.0.1:9123/?file=KEY&worktree=wt-msvqmweb-47hcdg&mode=embedded&scope=worktree'
const MERGE_URL = 'http://127.0.0.1:9123/?file=KEY&worktree=wt-msvqmweb-47hcdg&mode=embedded&scope=mergePreview'
const withLang = (url, lang) => {
  const target = new URL(url)
  target.searchParams.set('lang', lang)
  return target.toString()
}
const UNITS = [
  { unitId: 'u-msvo3wpe-p4pqi4', name: '销售', type: 2, kind: 'modified', worktreeUrl: VIEW_URL + '&unit=u-msvo3wpe-p4pqi4', mergeUrl: MERGE_URL + '&unit=u-msvo3wpe-p4pqi4' },
  { unitId: 'u-msvy1lry-dv3hia', name: '班级成绩汇报', type: 3, kind: 'added', worktreeUrl: VIEW_URL + '&unit=u-msvy1lry-dv3hia', mergeUrl: MERGE_URL + '&unit=u-msvy1lry-dv3hia' },
  { unitId: 'u-gone-000001', name: '', type: 2, kind: 'deleted', worktreeUrl: VIEW_URL + '&unit=u-gone-000001', mergeUrl: MERGE_URL + '&unit=u-gone-000001' },
]
const DEFAULT_UNIT_URL = VIEW_URL + '&unit=' + encodeURIComponent(UNITS[0].unitId)
const SLIDE_UNIT_URL = VIEW_URL + '&unit=' + encodeURIComponent(UNITS[1].unitId)
const DEFAULT_MERGE_URL = MERGE_URL + '&unit=' + encodeURIComponent(UNITS[0].unitId)
const ZH_OPEN_URL = withLang(OPEN_URL, 'zh-CN')
const EN_OPEN_URL = withLang(OPEN_URL, 'en-US')
const ZH_DEFAULT_UNIT_URL = withLang(DEFAULT_UNIT_URL, 'zh-CN')
const EN_DEFAULT_UNIT_URL = withLang(DEFAULT_UNIT_URL, 'en-US')
const ZH_SLIDE_UNIT_URL = withLang(SLIDE_UNIT_URL, 'zh-CN')
const EN_SLIDE_UNIT_URL = withLang(SLIDE_UNIT_URL, 'en-US')
const ZH_DEFAULT_MERGE_URL = withLang(DEFAULT_MERGE_URL, 'zh-CN')
let worktrees = []
const wt = (status, worktreeId = WORKTREE) => ({
  worktreeId,
  name: worktreeId === WORKTREE ? 'v3smoke' : 'other',
  status,
  units: status === 'draft' || status === 'ready' ? UNITS : [],
  ...(status === 'draft' || status === 'ready' ? { openUrl: OPEN_URL, worktreeUrl: VIEW_URL } : {}),
  ...(status === 'ready' ? { mergeUrl: MERGE_URL } : {}),
})
const currentState = () => ({
  ok: true,
  file: DEMO_FILE,
  gateway: 'http://127.0.0.1:9123',
  gatewayRunning: true,
  viewerUrl: 'http://127.0.0.1:9123/?file=KEY',
  worktrees,
})
const actionLog = []
let failMerge = false
const stateRequests = []
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  if (req.method === 'GET' && url.pathname === '/univer-api/state') {
    const file = url.searchParams.get('file')
    if (url.searchParams.get('sessionId') !== 'test-session-id') {
      res.writeHead(400).end()
      return
    }
    stateRequests.push(file)
    if (file !== DEMO_FILE && file !== REL_DEMO_FILE && file !== SECOND_FILE) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(currentState()))
    return
  }
  if (req.method === 'POST' && url.pathname === '/univer-api/worktree-action') {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (body.sessionId !== 'test-session-id') {
      res.writeHead(400).end()
      return
    }
    actionLog.push(body)
    if (failMerge && body.action === 'merge') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: false, reason: '销售图表 与 trunk 冲突，无法合并', state: currentState() }))
      return
    }
    const next = body.action === 'merge' ? 'merged' : body.action === 'reopen' ? 'draft' : body.action === 'ready' ? 'ready' : null
    worktrees = worktrees
      .filter((item) => body.action !== 'discard' || item.worktreeId !== body.worktreeId)
      .map((item) => (item.worktreeId === body.worktreeId && next !== null ? wt(next) : item))
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, action: body.action, worktreeId: body.worktreeId, state: currentState() }))
    return
  }
  res.writeHead(404).end()
})
await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise))
const origin = `http://127.0.0.1:${server.address().port}`

// ---- jsdom + module loading ----
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: origin + '/' })
// jsdom does not implement PointerEvent; the dock drag simulation needs it.
if (dom.window.PointerEvent === undefined) {
  dom.window.PointerEvent = class PointerEvent extends dom.window.MouseEvent {
    constructor(type, params = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
      this.pointerType = params.pointerType ?? 'mouse'
      this.isPrimary = params.isPrimary ?? true
    }
  }
}
globalThis.window = dom.window
globalThis.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
Object.defineProperty(dom.window, 'innerWidth', { value: 1440, writable: true, configurable: true })
Object.defineProperty(dom.window, 'innerHeight', { value: 1000, writable: true, configurable: true })

const React = repoRequire('react')
const jsxRuntime = repoRequire('react/jsx-runtime')
const { createRoot } = repoRequire('react-dom/client')

let pluginExports = null
dom.window.__ModuleLoader__ = {
  load({ id, factory }) {
    const requireMock = (spec) => {
      if (spec === 'react') return React
      if (spec === 'react/jsx-runtime') return jsxRuntime
      throw new Error(`unexpected require("${spec}")`)
    }
    pluginExports = factory(requireMock)
  },
}
const source = readFileSync(join(root, 'lib/client.js'), 'utf8')
new Function('window', `${source}\n//# sourceURL=lib/client.js`)(dom.window)
if (pluginExports === null) throw new Error('client module did not register via __ModuleLoader__.load')
if (typeof pluginExports.apply !== 'function') throw new Error('client module exports no apply')

// ---- mock ctx mount ----
const slotEntries = []
let localeDicts = null
let conversationDefinition = null
let activeLocale = 'zh'
let localeRevision = 0
const fakeCtx = {
  effect(fn) {
    const disposer = fn()
    return () => { if (typeof disposer === 'function') disposer() }
  },
  slots: {
    register(options, Component) {
      slotEntries.push({ options, Component })
      return () => {}
    },
    inject(key, callback) {
      if (key !== 'conversation.input.dock' && key !== 'conversation.chat.turnTail') throw new Error(`unexpected slots.inject("${key}")`)
      return callback()
    },
  },
  locale: {
    register(ns, dicts) {
      localeDicts = { ns, dicts }
      return () => {}
    },
    bind() {
      return (key) => (localeDicts?.dicts[activeLocale][key] ?? key)
    },
    getSnapshot() {
      return { active: activeLocale, revision: localeRevision }
    },
  },
  conversationEvents: {
    register(definition) {
      conversationDefinition = definition
      return () => {}
    },
  },
}
pluginExports.apply(fakeCtx)
const dockEntry = slotEntries.find((entry) => entry.options.name === 'conversation.input.dock' && entry.options.id === 'univer-dock')
const tailEntry = slotEntries.find((entry) => entry.options.name === 'conversation.chat.turnTail')
if (dockEntry === undefined) throw new Error('dock entry missing: ' + slotEntries.map((e) => e.options.name + '/' + e.options.id).join(','))
if (tailEntry === undefined) throw new Error('turn-tail entry missing (existing preview card must stay registered)')
if ('id' in tailEntry.options) throw new Error('chain entries must not declare a list-slot id')
if (localeDicts === null || localeDicts.ns !== 'univer') throw new Error('locale dictionaries not registered')
if (conversationDefinition === null || conversationDefinition.kind !== 'univerTarget') throw new Error('conversationEvents definition not registered')
if (dockEntry.options.locale !== 'univer' || tailEntry.options.locale !== 'univer') throw new Error('both UI entries must declare the Univer locale namespace')
const dockInjected = dockEntry.options.inject()
const tailInjected = tailEntry.options.inject()
if (typeof dockInjected.getViewerLocale !== 'function' || typeof tailInjected.getViewerLocale !== 'function') throw new Error('Viewer locale getter missing')

// ---- definition pure-accumulator sanity (replay-safe, unchanged behavior) ----
{
  const def = conversationDefinition
  const mkContext = (state) => ({ state, key: '', kind: 'univerTarget', id: '7', matches: [], start: undefined, current: new Map() })
  const startMatch = { id: '7', role: 'start', event: { type: 'turn/start', data: { turn: 7 } }, location: { kind: 'turn', turn: 7 } }
  let state = def.start({ state: undefined }, startMatch, { previous: () => undefined })
  if (state.turn !== 7 || state.targets.length !== 0) throw new Error('definition start state wrong')
  const univerCall = {
    id: '7', role: 'update', location: { kind: 'turn', turn: 7 },
    event: { type: 'tool/call', data: { turn: 7, name: 'univer_execute', arguments: JSON.stringify({ file: '/x/proj/notes/demo.univer', worktreeId: 'wt-abc12345', unitId: 'unit-1', code: 'return null;' }) } },
  }
  state = def.update(mkContext(state), univerCall)
  if (state.targets.length !== 1 || state.targets[0].file !== '/x/proj/notes/demo.univer' || state.targets[0].worktreeId !== 'wt-abc12345') throw new Error('structured target extraction wrong: ' + JSON.stringify(state.targets))
  const univerResult = {
    id: '7', role: 'update', location: { kind: 'turn', turn: 7 },
    event: { type: 'tool/result', data: { turn: 7, step: 1, message: { content: [{ type: 'tool-result', content: [{ type: 'text', text: JSON.stringify({ file: '/x/proj/notes/result.univer', result: { worktreeId: 'wt-result-1234' } }) }] }] } } },
  }
  state = def.update(mkContext(state), univerResult)
  if (state.targets.length !== 2 || state.targets[1].file !== '/x/proj/notes/result.univer' || state.targets[1].worktreeId !== 'wt-result-1234') throw new Error('typed tool-result extraction wrong: ' + JSON.stringify(state.targets))
  const locationData = def.buildLocationData(mkContext(state), 'turn')
  if (locationData === null || locationData.key !== 'univerTarget' || locationData.value.targets.length !== 2) throw new Error('buildLocationData wrong')
}

// ---- render harness ----
const t = (key) => localeDicts.dicts[activeLocale][key] ?? key
const sessionWithTargets = (targets, running) => ({
  sessionId: 'test-session-id',
  running,
  chat: { timeline: { turns: new Map([[3, { data: { get: (key) => (key === 'univerTarget' ? { targets } : undefined) } }]]) } },
})
const rootEl = document.createElement('div')
document.body.appendChild(rootEl)
const reactRoot = createRoot(rootEl)
const SESSION_CWD = join(tmpdir(), 'dsh-univer-client-smoke', 'workdir')
const REL_DEMO_FILE = SESSION_CWD + '/work_班级成绩表/班级管理.univer'
let scenario = 0
function render(session, remount = true) {
  if (remount) scenario += 1
  reactRoot.render(React.createElement(dockEntry.Component, {
    key: 's' + scenario,
    session,
    t,
    getViewerLocale: dockInjected.getViewerLocale,
    sessionId: 'test-session-id',
    useSessions: (selector) => selector({ byId: { 'test-session-id': { cwd: SESSION_CWD } } }),
  }))
}
async function waitFor(description, predicate, timeoutMs = 5000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 80))
  }
  throw new Error(`timeout waiting for: ${description}\nhtml: ${document.body.innerHTML.slice(0, 1500)}`)
}
const q = (selector) => document.querySelector(selector)
const qa = (selector) => Array.from(document.querySelectorAll(selector))

// ---- turn-tail preview: full standalone Viewer, not embedded mode ----
const tailRootEl = document.createElement('div')
document.body.appendChild(tailRootEl)
const tailRoot = createRoot(tailRootEl)
worktrees = [wt('draft')]
const tailProps = {
  matched: { targets: [{ file: DEMO_FILE, worktreeId: WORKTREE }] },
  sessionId: 'test-session-id',
  t,
  getViewerLocale: tailInjected.getViewerLocale,
  useSessions: (selector) => selector({ byId: { 'test-session-id': { cwd: SESSION_CWD } } }),
}
tailRoot.render(React.createElement(tailEntry.Component, tailProps))
await waitFor('回合尾部预览卡片', () => q('.unvT_expandBtn') !== null)
await waitFor('卡片显示 worktree 名称', () => q('.unvT_wt')?.textContent === 'v3smoke')
if ((q('.unvT_title')?.textContent ?? '').includes(WORKTREE)) throw new Error('preview card must not expose the raw worktreeId')
q('.unvT_expandBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
await waitFor('中文完整 Viewer 页面', () => q('.unvT_frame')?.getAttribute('src') === ZH_OPEN_URL)
const tailFrame = q('.unvT_frame')
activeLocale = 'en'
localeRevision += 1
tailRoot.render(React.createElement(tailEntry.Component, tailProps))
await waitFor('预览卡片切换英文', () => q('.unvT_expandBtn')?.textContent.includes('Collapse') === true && q('.unvT_frame')?.getAttribute('title') === 'Univer Preview')
if (q('.unvT_frame') !== tailFrame) throw new Error('locale switch must update the existing standalone Viewer iframe')
if (q('.unvT_frame')?.getAttribute('src') !== EN_OPEN_URL) throw new Error('standalone Viewer must receive en-US after DSH switches to English')
activeLocale = 'zh'
localeRevision += 1
tailRoot.render(React.createElement(tailEntry.Component, tailProps))
await waitFor('预览卡片切回中文', () => q('.unvT_frame')?.getAttribute('src') === ZH_OPEN_URL && q('.unvT_frame')?.getAttribute('title') === 'Univer 预览')

// A relative tool-call path and the absolute tool-result path identify one file and one card.
tailRoot.render(React.createElement(tailEntry.Component, {
  ...tailProps,
  matched: { targets: [
    { file: 'work_班级成绩表/班级管理.univer', worktreeId: null },
    { file: REL_DEMO_FILE, worktreeId: WORKTREE },
  ] },
}))
await waitFor('相对路径和绝对路径去重为一张卡片', () => qa('.unvT_card').length === 1 && q('.unvT_path')?.textContent === REL_DEMO_FILE)
if (q('.unvT_chip') !== null) throw new Error('file-switch chips must not exist in one-file-per-card UI')

// Distinct files touched in one turn each receive their own card.
tailRoot.render(React.createElement(tailEntry.Component, {
  ...tailProps,
  matched: { targets: [
    { file: DEMO_FILE, worktreeId: WORKTREE },
    { file: SECOND_FILE, worktreeId: null },
  ] },
}))
await waitFor('同一回合的两个文件分别显示卡片', () => qa('.unvT_card').length === 2)
const previewPaths = qa('.unvT_path').map((element) => element.textContent)
if (previewPaths.join('|') !== `${DEMO_FILE}|${SECOND_FILE}`) throw new Error('preview cards must preserve file order: ' + previewPaths.join(','))
tailRoot.unmount()
tailRootEl.remove()

// ---- scenario 0: no targets → no UI ----
worktrees = [wt('draft')]
render(sessionWithTargets([], false))
await waitFor('no UI without targets', () => q('.uvf_root') === null && q('.uvf_panel') === null)

// ---- scenario 0b: relative target resolves against the session cwd ----
worktrees = [wt('ready')]
render(sessionWithTargets([{ file: 'work_班级成绩表/班级管理.univer', worktreeId: WORKTREE }], false))
await waitFor('相对路径解析后出现审阅面板', () => q('.uvf_panel') !== null)
if (stateRequests.at(-1) !== REL_DEMO_FILE) throw new Error('relative target must be polled as absolute: ' + stateRequests.join(', '))
if ((q('.uvf_panelTitle')?.textContent ?? '').includes('v3smoke') === false) throw new Error('panel must name the worktree')

// ---- scenario 1: draft → floating window with live iframe ----
worktrees = [wt('merged', 'wt-other-000001'), wt('draft')]
const liveDraftSession = sessionWithTargets([{ file: DEMO_FILE, worktreeId: WORKTREE }], true)
render(liveDraftSession)
await waitFor('draft 浮窗出现', () => q('.uvf_win') !== null)
if (q('.uvf_frame')?.getAttribute('src') !== ZH_DEFAULT_UNIT_URL) throw new Error('window iframe must default to the changed unit in the DSH locale')
{
  const chips = qa('.uvf_unit')
  if (chips.length !== 3) throw new Error('unit chips missing: ' + chips.length)
  if ((chips[2].textContent ?? '').includes('删') === false || (chips[2].textContent ?? '').includes('u-gone')) {
    throw new Error('nameless deleted chip must show the kind label, not the unitId: ' + chips[2].textContent)
  }
  if (chips[0].className.includes('uvf_unit_on') === false) throw new Error('default chip must be the first changed unit')
  if (chips[0].getAttribute('data-kind') !== 'modified') throw new Error('chip must carry its change kind')
  if ((chips[0].textContent ?? '').includes('销售') === false) throw new Error('chip must name the unit')
  chips[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  await waitFor('切换 unit 后 iframe 跟随', () => q('.uvf_frame')?.getAttribute('src') === ZH_SLIDE_UNIT_URL)
}
if ((q('.uvf_windowTitle')?.textContent ?? '').includes('v3smoke') === false) throw new Error('title must name the draft worktree')
if (qa('.uvf_win').length !== 1) throw new Error('worktrees the session never mentioned must stay hidden')
if (q('.uvf_panel') !== null) throw new Error('no merge panel while the worktree is draft')

// ---- scenario 1b: DSH locale switch updates shell copy and the live Viewer in place ----
{
  const frame = q('.uvf_frame')
  activeLocale = 'en'
  localeRevision += 1
  render(liveDraftSession, false)
  await waitFor('浮窗切换英文', () => q('.uvf_chip')?.textContent === 'Editing' && q('[data-window-action=close]')?.getAttribute('title') === 'Close')
  if (q('.uvf_frame') !== frame) throw new Error('locale switch must preserve the live iframe element')
  if (q('.uvf_frame')?.getAttribute('src') !== EN_SLIDE_UNIT_URL) throw new Error('live Viewer must receive en-US after DSH switches to English')
  activeLocale = 'zh'
  localeRevision += 1
  render(liveDraftSession, false)
  await waitFor('浮窗切回中文', () => q('.uvf_chip')?.textContent === '修改中' && q('.uvf_frame')?.getAttribute('src') === ZH_SLIDE_UNIT_URL)
}

// ---- scenario 2: window controls / drag / bounded eight-way resize ----
{
  const win = q('.uvf_win')
  const header = q('.uvf_windowHeader')
  const px = (property) => Number.parseFloat(win.style[property])
  if (px('width') !== 560 || px('height') !== 420) throw new Error('window must use the new default geometry')
  if (qa('.uvf_resizeHandle').map((handle) => handle.getAttribute('data-direction')).join(',') !== 'nw,n,ne,w,e,sw,s,se') {
    throw new Error('window must expose all eight resize directions')
  }
  // Double-clicking the title bar maximizes; the explicit control restores.
  header.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true, button: 0 }))
  await waitFor('双击标题栏放大', () => win.className.includes('uvf_win_max'))
  q('[data-window-action=maximize]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  await waitFor('还原', () => win.className.includes('uvf_win_max') === false)
  // Dragging updates viewport coordinates and never changes display mode.
  const dragStart = { left: px('left'), top: px('top') }
  header.dispatchEvent(new dom.window.PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 8, clientX: 100, clientY: 20 }))
  header.dispatchEvent(new dom.window.PointerEvent('pointermove', { bubbles: true, pointerId: 8, clientX: 60, clientY: 170 }))
  header.dispatchEvent(new dom.window.PointerEvent('pointerup', { bubbles: true, pointerId: 8 }))
  await waitFor('拖拽位移写入视口坐标', () => px('left') === dragStart.left - 40 && px('top') === dragStart.top + 150)
  if (win.className.includes('uvf_win_max')) throw new Error('drag must not maximize')
  // Fold hides the body without unmounting or reloading the Viewer iframe.
  const frameBeforeFold = q('.uvf_frame')
  q('[data-window-action=fold]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  await waitFor('折叠后只显示标题条', () => q('.uvf_win') !== null && q('.uvf_win').className.includes('uvf_win_folded') && q('.uvf_windowBody')?.hidden === true)
  if (q('.uvf_frame') !== frameBeforeFold) throw new Error('fold must keep the Viewer iframe mounted')
  q('[data-window-action=fold]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  await waitFor('展开后 Viewer 恢复', () => q('.uvf_windowBody')?.hidden === false)
  if (q('.uvf_frame') !== frameBeforeFold) throw new Error('expand must reuse the loaded Viewer iframe')
  // South-east grows both dimensions without moving the north-west corner.
  {
    const handle = q('[data-direction=se]')
    if (handle === null) throw new Error('se resize handle missing')
    const start = { left: px('left'), top: px('top'), width: px('width'), height: px('height') }
    handle.dispatchEvent(new dom.window.PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 9, clientX: 500, clientY: 400 }))
    handle.dispatchEvent(new dom.window.PointerEvent('pointermove', { bubbles: true, pointerId: 9, clientX: 540, clientY: 480 }))
    handle.dispatchEvent(new dom.window.PointerEvent('pointerup', { bubbles: true, pointerId: 9 }))
    await waitFor('右下角缩放生效', () => px('left') === start.left && px('top') === start.top && px('width') === start.width + 40 && px('height') === start.height + 80)
  }
  // North-west moves the origin while keeping the opposite corner fixed.
  {
    const handle = q('[data-direction=nw]')
    if (handle === null) throw new Error('nw resize handle missing')
    const start = { left: px('left'), top: px('top'), width: px('width'), height: px('height') }
    handle.dispatchEvent(new dom.window.PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 10, clientX: 100, clientY: 100 }))
    handle.dispatchEvent(new dom.window.PointerEvent('pointermove', { bubbles: true, pointerId: 10, clientX: 160, clientY: 140 }))
    handle.dispatchEvent(new dom.window.PointerEvent('pointerup', { bubbles: true, pointerId: 10 }))
    await waitFor('左上角缩放生效', () => px('left') === start.left + 60 && px('top') === start.top + 40 && px('width') === start.width - 60 && px('height') === start.height - 40)
  }
  // East and south edges resize independently.
  {
    const handle = q('[data-direction=e]')
    if (handle === null) throw new Error('east resize handle missing')
    const start = { left: px('left'), width: px('width') }
    handle.dispatchEvent(new dom.window.PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 13, clientX: 200, clientY: 200 }))
    handle.dispatchEvent(new dom.window.PointerEvent('pointermove', { bubbles: true, pointerId: 13, clientX: 160, clientY: 200 }))
    handle.dispatchEvent(new dom.window.PointerEvent('pointerup', { bubbles: true, pointerId: 13 }))
    await waitFor('右边缘缩放生效', () => px('left') === start.left && px('width') === start.width - 40)
  }
  {
    const handle = q('[data-direction=s]')
    if (handle === null) throw new Error('south resize handle missing')
    const start = { width: px('width'), height: px('height') }
    handle.dispatchEvent(new dom.window.PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 12, clientX: 200, clientY: 340 }))
    handle.dispatchEvent(new dom.window.PointerEvent('pointermove', { bubbles: true, pointerId: 12, clientX: 200, clientY: 380 }))
    handle.dispatchEvent(new dom.window.PointerEvent('pointerup', { bubbles: true, pointerId: 12 }))
    await waitFor('底边缘缩放生效', () => px('height') === start.height + 40 && px('width') === start.width)
  }
  // Dragging and resizing clamp to the viewport and react to viewport changes.
  header.dispatchEvent(new dom.window.PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 14, clientX: 100, clientY: 100 }))
  header.dispatchEvent(new dom.window.PointerEvent('pointermove', { bubbles: true, pointerId: 14, clientX: -10000, clientY: -10000 }))
  header.dispatchEvent(new dom.window.PointerEvent('pointerup', { bubbles: true, pointerId: 14 }))
  await waitFor('拖拽夹紧到视口左上角', () => px('left') === 12 && px('top') === 12)
  {
    const handle = q('[data-direction=w]')
    handle.dispatchEvent(new dom.window.PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 15, clientX: 0, clientY: 100 }))
    handle.dispatchEvent(new dom.window.PointerEvent('pointermove', { bubbles: true, pointerId: 15, clientX: 10000, clientY: 100 }))
    handle.dispatchEvent(new dom.window.PointerEvent('pointerup', { bubbles: true, pointerId: 15 }))
    await waitFor('缩放夹紧到最小宽度', () => px('width') === 360)
  }
  dom.window.innerWidth = 700
  dom.window.innerHeight = 520
  dom.window.dispatchEvent(new dom.window.Event('resize'))
  await waitFor('视口缩小后窗口仍可见', () => px('left') >= 12 && px('top') >= 12 && px('left') + px('width') <= 688 && px('top') + px('height') <= 508)
  dom.window.innerWidth = 1440
  dom.window.innerHeight = 1000
  dom.window.dispatchEvent(new dom.window.Event('resize'))
  // Dismiss removes the window while the status stays draft.
  q('[data-window-action=close]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  await waitFor('关闭后浮窗消失', () => q('.uvf_win') === null)
}

// ---- scenario 3: ready + session running → window stays with ready chip ----
worktrees = [wt('ready')]
render(sessionWithTargets([{ file: DEMO_FILE, worktreeId: WORKTREE }], true))
await waitFor('ready 且运行中浮窗保留', () => q('.uvf_win') !== null)
if ((q('.uvf_chip')?.textContent ?? '') !== '待确认') throw new Error('ready chip must say 待确认 while running')
if (q('.uvf_panel') !== null) throw new Error('no merge panel while the session is running')

// ---- scenario 3b: draft + session end → review dock with mark-ready ----
worktrees = [wt('draft')]
render(sessionWithTargets([{ file: DEMO_FILE, worktreeId: WORKTREE }], false))
await waitFor('draft 审阅面板出现（会话结束后）', () => q('.uvf_panel') !== null)
if (q('.uvf_win') !== null) throw new Error('no floating window for a draft worktree after session end')
if (q('.uvf_panelFrame')?.getAttribute('src') !== ZH_DEFAULT_UNIT_URL) throw new Error('draft panel must embed the localized live worktree page at the changed unit')
if ((q('.uvf_panelChip')?.textContent ?? '') !== '修改中') throw new Error('draft panel chip must match the Viewer status wording')
if ((q('.uvf_hint')?.textContent ?? '').includes('提交确认') === false) throw new Error('draft panel must use the Viewer confirmation wording')
{
  const kinds = qa('.uvf_action').map((el) => el.getAttribute('data-kind'))
  if (kinds.includes('ready') === false || kinds.includes('discard') === false || kinds.includes('merge') === true) {
    throw new Error('draft panel actions wrong: ' + kinds.join(','))
  }
}
{
  const frame = q('.uvf_panelFrame')
  const reviewSession = sessionWithTargets([{ file: DEMO_FILE, worktreeId: WORKTREE }], false)
  activeLocale = 'en'
  localeRevision += 1
  render(reviewSession, false)
  await waitFor('审阅面板切换英文', () => (q('.uvf_panelTitle')?.textContent ?? '').includes('Modification in progress') && q('.uvf_panelFrame')?.getAttribute('src') === EN_DEFAULT_UNIT_URL)
  if (q('.uvf_panelFrame') !== frame) throw new Error('locale switch must preserve the review iframe element')
  activeLocale = 'zh'
  localeRevision += 1
  render(reviewSession, false)
  await waitFor('审阅面板切回中文', () => (q('.uvf_panelTitle')?.textContent ?? '').includes('正在进行的修改') && q('.uvf_panelFrame')?.getAttribute('src') === ZH_DEFAULT_UNIT_URL)
}
q('.uvf_action[data-kind=ready]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
await waitFor('标记 ready 后切到合并预览', () => q('.uvf_panelFrame')?.getAttribute('src') === ZH_DEFAULT_MERGE_URL)
if ((q('.uvf_panelChip')?.textContent ?? '') !== '待确认') throw new Error('panel chip must switch to 待确认')
if (q('.uvf_action[data-kind=merge]') === null) throw new Error('merge action must appear once marked ready')
await waitFor('ready 操作恢复可用', () => q('.uvf_action[data-kind=merge]')?.disabled === false)

// ---- scenario 4: ready + session end → window closes, merge panel embeds ----
render(sessionWithTargets([{ file: DEMO_FILE, worktreeId: WORKTREE }], false))
await waitFor('会话结束后浮窗关闭', () => q('.uvf_win') === null)
await waitFor('合并预览面板出现', () => q('.uvf_panel') !== null)
if (q('.uvf_panelFrame')?.getAttribute('src') !== ZH_DEFAULT_MERGE_URL) throw new Error('panel iframe must embed the localized mergePreview page at the changed unit')
if ((q('.uvf_panelTitle')?.textContent ?? '').includes('v3smoke') === false) throw new Error('panel must name the ready worktree')
if ((q('.uvf_panelChip')?.textContent ?? '') !== '待确认') throw new Error('panel chip must say 待确认')
{
  const kinds = qa('.uvf_action').map((el) => el.getAttribute('data-kind'))
  if (kinds.includes('merge') === false || kinds.includes('discard') === false || kinds.includes('reopen') === true) {
    throw new Error('ready panel actions wrong: ' + kinds.join(','))
  }
}

// ---- scenario 4a: merge conflict → error shown, panel stays ----
failMerge = true
worktrees = [wt('ready')]
render(sessionWithTargets([], false))
await waitFor('冲突场景重置审阅面板', () => q('.uvf_panel') === null)
render(sessionWithTargets([{ file: DEMO_FILE, worktreeId: WORKTREE }], false))
await waitFor('ready 面板出现（冲突场景）', () => q('.uvf_action[data-kind=merge]') !== null)
q('.uvf_action[data-kind=merge]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
await waitFor('冲突错误显示', () => (q('.uvf_error')?.textContent ?? '').includes('冲突'))
if (q('.uvf_panel') === null) throw new Error('panel must stay after a failed merge')
failMerge = false

// ---- scenario 4b: merge success → terminal, nothing renders anywhere ----
render(sessionWithTargets([], false))
await waitFor('merge 成功场景重置审阅面板', () => q('.uvf_panel') === null)
render(sessionWithTargets([{ file: DEMO_FILE, worktreeId: WORKTREE }], false))
await waitFor('面板出现（merge 成功场景）', () => q('.uvf_panel') !== null)
q('.uvf_action[data-kind=merge]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
await waitFor('merge 后面板关闭', () => q('.uvf_panel') === null)
await new Promise((resolvePromise) => setTimeout(resolvePromise, 900))
if (q('.uvf_win') !== null) throw new Error('merged worktree must not open a window')

// ---- scenario 4c: discard → panel closes, no window ----
worktrees = [wt('ready')]
render(sessionWithTargets([], false))
await waitFor('discard 场景重置审阅面板', () => q('.uvf_panel') === null)
render(sessionWithTargets([{ file: DEMO_FILE, worktreeId: WORKTREE }], false))
await waitFor('ready 面板出现（discard 场景）', () => q('.uvf_action[data-kind=discard]') !== null)
q('.uvf_action[data-kind=discard]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
await waitFor('discard 后面板关闭', () => q('.uvf_panel') === null)
await new Promise((resolvePromise) => setTimeout(resolvePromise, 900))
if (q('.uvf_win') !== null) throw new Error('discarded worktree must not open a window')

// ---- scenario 5: merged + session end → nothing anywhere ----
worktrees = [wt('merged')]
render(sessionWithTargets([{ file: DEMO_FILE, worktreeId: WORKTREE }], false))
await new Promise((resolvePromise) => setTimeout(resolvePromise, 1100))
if (q('.uvf_panel') !== null || q('.uvf_win') !== null) throw new Error('merged worktree must render nowhere')

// ---- scenario 6: targets cleared → everything closes ----
render(sessionWithTargets([], false))
await waitFor('targets 清空后全部关闭', () => q('.uvf_win') === null && q('.uvf_panel') === null)

reactRoot.unmount()
server.close()
console.log('client smoke OK')
