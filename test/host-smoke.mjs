// Host-half smoke: mounts the plugin on a real Cordis Context with a mock
// webServer, serves its route handler on a local HTTP server, and asserts the
// loopback routes against the real univer CLI + daemon on this host.
//
//   node test/host-smoke.mjs
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = dirname(here)
const repoRoot = '/Users/otime/project/open-sources/deepseek-harness'

// The plugin imports @deepseek-ai/dsh-typert-protocol; the test imports
// @deepseek-ai/cordis. Resolve both through test-only node_modules symlinks
// into this workspace's package tree (never shipped, never committed).
function linkPackage(name, targetDir) {
  const link = join(root, 'node_modules/@deepseek-ai', name)
  if (!existsSync(link)) {
    mkdirSync(dirname(link), { recursive: true })
    let target = targetDir
    const existing = join(targetDir, 'node_modules/@deepseek-ai', name)
    if (existsSync(existing)) {
      const rel = readlinkSync(existing)
      target = resolve(dirname(existing), rel)
    }
    symlinkSync(target, link, 'dir')
  }
}
linkPackage('dsh-typert-protocol', join(repoRoot, 'packages/typert/protocol'))
linkPackage('cordis', join(repoRoot, 'packages/typert/protocol'))

const plugin = await import('../lib/index.js')
const { Context } = await import('@deepseek-ai/cordis')

let handler = null
const rootCtx = new Context()
rootCtx.provide('webServer', {
  register(route) {
    if (route.kind === 'prefix' && route.path === '/univer-api') handler = route.handler
    return () => {}
  },
})
rootCtx.plugin(plugin)
await Promise.resolve() // cordis applies satisfied plugins on the microtask queue
if (handler === null) throw new Error('route handler was not registered')

const DEMO_FILE = '/Users/otime/dev/learn/dsh-learn/.scratch-univer/demo.univer'
const DRAFT_WT = 'wt-msvqmweb-47hcdg'
const server = createServer(handler)
await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise))
const base = `http://127.0.0.1:${server.address().port}`

const getJson = async (path) => {
  const res = await fetch(base + path)
  return { status: res.status, body: await res.json() }
}

// status: daemon + CLI facts.
{
  const { status, body } = await getJson('/univer-api/status')
  if (status !== 200 || body.daemon === undefined || body.cli === undefined) throw new Error('status route wrong: ' + status)
  if (body.cli.ok === false) throw new Error('univer CLI not found on this host')
  console.log('status ok:', JSON.stringify(body.daemon), '| cli:', body.cli.cliPath)
}

// state: worktrees with lifecycle status and embedded Viewer deep-links.
{
  const { status, body } = await getJson('/univer-api/state?file=' + encodeURIComponent(DEMO_FILE))
  if (status !== 200 || body.ok !== true || !Array.isArray(body.worktrees)) {
    throw new Error('state route wrong: ' + JSON.stringify(body).slice(0, 300))
  }
  const live = body.worktrees.find((wt) => wt.worktreeId === DRAFT_WT)
  if (live === undefined) throw new Error('expected demo worktree in state: ' + JSON.stringify(body.worktrees))
  if (live.status === 'draft' || live.status === 'ready') {
    if (typeof live.worktreeUrl !== 'string' || !live.worktreeUrl.includes('mode=embedded&scope=worktree')) {
      throw new Error('live worktreeUrl wrong: ' + live.worktreeUrl)
    }
    if (live.worktreeUrl.includes('unit=')) throw new Error('host deep-links must stay unit-less; the client appends the selected unit')
    if (!Array.isArray(live.units) || live.units.length === 0) throw new Error('worktree units missing: ' + JSON.stringify(live.units))
    const sheetUnit = live.units.find((unit) => unit.unitId === 'u-msvo3wpe-p4pqi4')
    if (sheetUnit === undefined || sheetUnit.kind !== 'modified') throw new Error('demo sheet unit must be flagged modified: ' + JSON.stringify(live.units))
    if (live.units.some((unit) => !['added', 'modified', 'deleted', 'conflict'].includes(unit.kind))) {
      throw new Error('units must only list changed entries with valid kinds: ' + JSON.stringify(live.units))
    }
  }
  if (live.status === 'ready') {
    if (typeof live.mergeUrl !== 'string' || !live.mergeUrl.includes('mode=embedded&scope=mergePreview')) {
      throw new Error('ready mergeUrl wrong: ' + live.mergeUrl)
    }
  }
  const merged = body.worktrees.find((wt) => wt.status === 'merged')
  if (merged !== undefined && (typeof merged.trunkUrl !== 'string' || !merged.trunkUrl.includes('mode=embedded&scope=trunk'))) {
    throw new Error('merged trunkUrl wrong: ' + merged.trunkUrl)
  }
  if (body.gateway === null) throw new Error('daemon/gateway expected running on this host')
  console.log('state ok:', body.worktrees.map((wt) => wt.worktreeId + ':' + wt.status).join(', '), '@', body.gateway)
}

// missing file parameter → 400.
{
  const { status } = await getJson('/univer-api/state')
  if (status !== 400) throw new Error('missing file must be 400, got ' + status)
}

// unknown route → 404.
{
  const res = await fetch(base + '/univer-api/nope')
  if (res.status !== 404) throw new Error('unknown route must be 404, got ' + res.status)
}

// ensure-daemon reuses the running daemon.
{
  const res = await fetch(base + '/univer-api/ensure-daemon', { method: 'POST' })
  const body = await res.json()
  if (body.ok !== true || body.reused !== true) throw new Error('ensure-daemon reuse wrong: ' + JSON.stringify(body))
  console.log('ensure-daemon ok (reused)')
}

// Unit filtering: unchanged units never appear; modified/added/deleted do.
{
  const runCli = (args) => new Promise((resolvePromise) => {
    execFile('univer', args, { timeout: 30000, windowsHide: true }, (error, stdout) => {
      resolvePromise(error ? null : stdout)
    })
  })
  const SCRATCH = '/Users/otime/dev/learn/dsh-learn/.scratch-univer/filter-test.univer'
  rmSync(SCRATCH, { force: true })
  await runCli(['new', SCRATCH, '--json'])
  // Baseline worktree: create all three units, then merge so they enter trunk.
  const baseWt = JSON.parse(await runCli(['worktree', 'add', SCRATCH, '--name', '基线', '--json'])).worktreeId
  const keepUnit = JSON.parse(await runCli(['unit', 'add', SCRATCH, '--worktree', baseWt, '--type', 'sheet', '--name', '保持不变', '--json'])).unitId
  const editUnit = JSON.parse(await runCli(['unit', 'add', SCRATCH, '--worktree', baseWt, '--type', 'sheet', '--name', '将被修改', '--json'])).unitId
  const dropUnit = JSON.parse(await runCli(['unit', 'add', SCRATCH, '--worktree', baseWt, '--type', 'sheet', '--name', '将被删除', '--json'])).unitId
  await runCli(['worktree', 'merge', SCRATCH, '--worktree', baseWt, '--json'])
  // Test worktree: modify one unit, remove another, leave the third alone.
  const wtId = JSON.parse(await runCli(['worktree', 'add', SCRATCH, '--name', '筛选测试', '--json'])).worktreeId
  await runCli(['execute', SCRATCH, '--worktree', wtId, '--unit', editUnit, '-e', 'workbook.getActiveSheet().getRange("A1").setValue("edited");', '--json'])
  await runCli(['unit', 'remove', SCRATCH, '--worktree', wtId, '--unit', dropUnit, '--json'])
  const { body } = await getJson('/univer-api/state?file=' + encodeURIComponent(SCRATCH))
  const wt = body.worktrees.find((entry) => entry.worktreeId === wtId)
  if (wt === undefined) throw new Error('scratch worktree missing: ' + JSON.stringify(body.worktrees))
  const kinds = new Map(wt.units.map((unit) => [unit.unitId, unit.kind]))
  if (kinds.size !== 2) throw new Error('changed units must list exactly modified + deleted: ' + JSON.stringify(wt.units))
  if (kinds.get(editUnit) !== 'modified') throw new Error('edited unit must be kind modified: ' + JSON.stringify(wt.units))
  if (kinds.get(dropUnit) !== 'deleted') throw new Error('removed unit must be kind deleted: ' + JSON.stringify(wt.units))
  const dropEntry = wt.units.find((unit) => unit.unitId === dropUnit)
  if (dropEntry === undefined || dropEntry.name !== '将被删除') throw new Error('deleted unit must carry its name: ' + JSON.stringify(wt.units))
  if (kinds.has(keepUnit)) throw new Error('untouched unit must NOT be listed: ' + JSON.stringify(wt.units))
  // CLI fallback branch (gateway down): unchanged units must NOT be flagged as
  // deleted — the regression this guards lived exactly here.
  {
    const serviceCtx = new Context()
    const direct = new plugin.UniverService(serviceCtx, {})
    direct.daemonInfo = async () => ({ running: false, gateway: null })
    const fallbackUnits = await direct.unitsOf(SCRATCH, wtId)
    const fallbackKinds = new Map(fallbackUnits.map((unit) => [unit.unitId, unit.kind]))
    if (fallbackKinds.size !== 2) throw new Error('fallback: changed units must be exactly modified + deleted: ' + JSON.stringify(fallbackUnits))
    if (fallbackKinds.get(editUnit) !== 'modified') throw new Error('fallback: edited unit must be modified: ' + JSON.stringify(fallbackUnits))
    if (fallbackKinds.get(dropUnit) !== 'deleted') throw new Error('fallback: removed unit must be deleted: ' + JSON.stringify(fallbackUnits))
    if (fallbackKinds.has(keepUnit)) throw new Error('fallback: untouched unit must NOT be listed: ' + JSON.stringify(fallbackUnits))
    const dropFallback = fallbackUnits.find((unit) => unit.unitId === dropUnit)
    if (dropFallback === undefined || dropFallback.name !== '将被删除') throw new Error('fallback: deleted unit name must resolve from trunk: ' + JSON.stringify(fallbackUnits))
  }
  rmSync(SCRATCH, { force: true })
  console.log('unit filtering ok (added/modified/deleted listed, unchanged excluded)')
}

// worktree-action lifecycle on a scratch file (never touches demo.univer).
{
  const runCli = (args) => new Promise((resolvePromise) => {
    execFile('univer', args, { timeout: 30000, windowsHide: true }, (error, stdout) => {
      resolvePromise(error ? null : stdout)
    })
  })
  const SCRATCH = '/Users/otime/dev/learn/dsh-learn/.scratch-univer/panel-test.univer'
  rmSync(SCRATCH, { force: true })
  await runCli(['new', SCRATCH, '--json'])
  const addedRaw = await runCli(['worktree', 'add', SCRATCH, '--name', 'panel-smoke', '--json'])
  const added = JSON.parse(addedRaw)
  const wid = added.worktreeId
  if (typeof wid !== 'string' || wid === '') throw new Error('worktree add returned no worktreeId: ' + addedRaw)
  const post = async (payload) => fetch(base + '/univer-api/worktree-action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const res = await post({ action: 'discard', file: SCRATCH, worktree: wid })
  const body = await res.json()
  if (body.ok !== true || !Array.isArray(body.state?.worktrees)) throw new Error('discard action wrong: ' + JSON.stringify(body).slice(0, 300))
  const entry = body.state.worktrees.find((wt) => wt.worktreeId === wid)
  if (entry === undefined || entry.status !== 'discarded') throw new Error('discard must leave a discarded record: ' + JSON.stringify(body.state.worktrees))
  const bad = await post({ action: 'nope', file: SCRATCH, worktree: wid })
  if (bad.status !== 400) throw new Error('invalid action must be 400, got ' + bad.status)
  rmSync(SCRATCH, { force: true })
  console.log('worktree-action ok (discard on scratch file)')
}

server.close()
console.log('host smoke OK')
