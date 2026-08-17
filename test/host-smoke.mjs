// Host browser-protocol smoke: real node:http server over the generated router,
// with a deterministic service double. No global CLI or existing demo file.
import { createServer } from 'node:http'
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createUniverRouter } from '../lib/index.js'

const WORKSPACE = await mkdtemp(join(tmpdir(), 'dsh-univer-host-smoke-'))
const FILE = join(WORKSPACE, 'smoke.univer')
await writeFile(FILE, '')
const REAL_FILE = await realpath(FILE)
const SESSION = 'host-smoke-session'
const WORKTREE = 'wt-host-smoke'
const calls = []
const state = {
  ok: true,
  file: FILE,
  gateway: 'http://127.0.0.1:9123',
  gatewayRunning: true,
  viewerUrl: 'http://127.0.0.1:9123/?file=KEY',
  worktrees: [{
    worktreeId: WORKTREE,
    name: 'host smoke',
    status: 'ready',
    units: [{ unitId: 'unit-1', name: 'Sheet 1', type: 'sheet', kind: 'modified' }],
    openUrl: 'http://127.0.0.1:9123/?file=KEY&worktree=wt-host-smoke',
    worktreeUrl: 'http://127.0.0.1:9123/?file=KEY&worktree=wt-host-smoke&scope=worktree',
    mergeUrl: 'http://127.0.0.1:9123/?file=KEY&worktree=wt-host-smoke&scope=mergePreview',
  }],
}
const service = {
  async gatewayStatus() { return { phase: 'stopped', gateway: null, owned: false } },
  async unitContentStatus() { return 'bundled' },
  async ensureGateway() { calls.push(['ensureGateway']); return { ok: true, gateway: 'http://127.0.0.1:9123', reused: false } },
  async fileState(request) { calls.push(['fileState', request]); return state },
  async worktreeAction(request) {
    calls.push(['worktreeAction', request])
    return { ok: true, action: request.action, worktreeId: request.worktreeId, state }
  },
}
const sessions = {
  get(id) { return id === SESSION ? { header: { cwd: WORKSPACE } } : undefined },
}

const server = createServer(createUniverRouter(service, sessions))
await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})
const address = server.address()
if (address === null || typeof address === 'string') throw new Error('host smoke did not receive a TCP port')
const origin = `http://127.0.0.1:${address.port}`

try {
  const status = await json('/univer-api/status')
  if (status.response.status !== 200 || status.body.gateway?.phase !== 'stopped' || status.body.unitContent !== 'bundled') {
    throw new Error(`status route failed: ${JSON.stringify(status.body)}`)
  }

  const start = await json('/univer-api/gateway/start', { method: 'POST' })
  if (start.response.status !== 200 || start.body.ok !== true || calls[0]?.[0] !== 'ensureGateway') {
    throw new Error(`Gateway start route failed: ${JSON.stringify(start.body)}`)
  }

  const fileState = await json(`/univer-api/state?file=${encodeURIComponent(FILE)}&sessionId=${SESSION}`)
  if (fileState.response.status !== 200 || fileState.body.viewerUrl !== state.viewerUrl || fileState.body.worktrees?.[0]?.openUrl !== state.worktrees[0].openUrl) {
    throw new Error(`state route failed: ${JSON.stringify(fileState.body)}`)
  }
  if (calls[1]?.[1]?.file !== REAL_FILE) throw new Error('state route did not pass the validated file')

  const action = await json('/univer-api/worktree-action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'merge', file: FILE, sessionId: SESSION, worktreeId: WORKTREE }),
  })
  if (action.response.status !== 200 || action.body.ok !== true || calls[2]?.[1]?.worktreeId !== WORKTREE) {
    throw new Error(`worktree action route failed: ${JSON.stringify(action.body)}`)
  }

  const missing = await json('/univer-api/state')
  if (missing.response.status !== 400 || missing.body.code !== 'INVALID_REQUEST') throw new Error('missing file must return INVALID_REQUEST')
  const relative = await json(`/univer-api/state?file=smoke.univer&sessionId=${SESSION}`)
  if (relative.response.status !== 200 || calls[3]?.[1]?.file !== REAL_FILE) throw new Error('relative file must resolve inside the session workspace')
  const missingSession = await json(`/univer-api/state?file=${encodeURIComponent(FILE)}`)
  if (missingSession.response.status !== 400 || missingSession.body.code !== 'INVALID_REQUEST') throw new Error('missing sessionId must return INVALID_REQUEST')
  const outside = await json(`/univer-api/state?file=${encodeURIComponent(import.meta.filename)}&sessionId=${SESSION}`)
  if (outside.response.status !== 403 || outside.body.code !== 'SESSION_SCOPE_DENIED') throw new Error('outside-workspace file must be denied')
  const invalidAction = await json('/univer-api/worktree-action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'destroy', file: FILE, sessionId: SESSION, worktreeId: WORKTREE }),
  })
  if (invalidAction.response.status !== 400) throw new Error('invalid action must return 400')
  const unknown = await fetch(`${origin}/univer-api/unknown`)
  if (unknown.status !== 404) throw new Error('unknown route must return 404')
} finally {
  await new Promise((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)))
  await rm(WORKSPACE, { recursive: true, force: true })
}

console.log('host smoke OK (Gateway naming, request validation, state, user review action)')

async function json(path, init) {
  const response = await fetch(`${origin}${path}`, init)
  return { response, body: await response.json() }
}
