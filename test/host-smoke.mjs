// Host browser-protocol smoke: real node:http server over the generated router,
// with a deterministic service double. No global CLI or existing demo file.
import { createServer } from 'node:http'
import { chmod, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as UniverPlugin from '../lib/index.js'

const { createUniverRouter, resolveConfig } = UniverPlugin

const defaultConfig = resolveConfig()
if (defaultConfig.gatewayPort !== 9080) throw new Error(`default Gateway port must be 9080: ${JSON.stringify(defaultConfig)}`)
try {
  resolveConfig({ gatewayPort: 0 })
  throw new Error('zero Gateway port must be rejected')
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes('gatewayPort')) throw error
}

const WORKSPACE = await mkdtemp(join(tmpdir(), 'dsh-univer-host-smoke-'))
const FILE = join(WORKSPACE, 'smoke.univer')
await writeFile(FILE, '')
const REAL_FILE = await realpath(FILE)
const LOCKED_DIRECTORY = join(WORKSPACE, 'locked')
const LOCKED_FILE = join(LOCKED_DIRECTORY, 'locked.univer')
const canEnforcePermissionDenied = process.platform !== 'win32'
await mkdir(LOCKED_DIRECTORY)
await writeFile(LOCKED_FILE, '')
if (canEnforcePermissionDenied) await chmod(LOCKED_DIRECTORY, 0)
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
const gatewayBlocker = createServer((_request, response) => {
  response.writeHead(404)
  response.end()
})
const ownsGatewayBlocker = await listenOrAcceptOccupied(gatewayBlocker, 65_535)
const toolContext = new Context()

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
  if (canEnforcePermissionDenied) {
    const permissionDenied = await json(`/univer-api/state?file=${encodeURIComponent(LOCKED_FILE)}&sessionId=${SESSION}`)
    if (permissionDenied.response.status !== 403 || permissionDenied.body.code !== 'FILE_PERMISSION_DENIED') {
      throw new Error(`permission failure must stay distinct from a missing path: ${JSON.stringify(permissionDenied.body)}`)
    }
  }
  const invalidAction = await json('/univer-api/worktree-action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'destroy', file: FILE, sessionId: SESSION, worktreeId: WORKTREE }),
  })
  if (invalidAction.response.status !== 400) throw new Error('invalid action must return 400')
  const unknown = await fetch(`${origin}/univer-api/unknown`)
  if (unknown.status !== 404) throw new Error('unknown route must return 404')

  await toolContext.plugin(SystemPrompt)
  await toolContext.plugin(ToolRuntime)
  await toolContext.plugin(UniverPlugin, {
    gatewayPort: 65_535,
    gatewayStartupTimeoutMs: 50,
    gatewayRequestTimeoutMs: 50,
    skills: false,
  })
  const owner = { ctx: toolContext, session: { header: { cwd: WORKSPACE } } }
  const missingToolResult = await toolContext.tools.execute({
    signal: new AbortController().signal,
    callId: CallId('host-smoke-missing-path'),
    name: 'univer_status',
    arguments: { file: 'missing.univer' },
    agent: owner,
  })
  assertToolError(missingToolResult, 'INVALID_FILE_PATH')

  if (canEnforcePermissionDenied) {
    const permissionToolResult = await toolContext.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('host-smoke-permission'),
      name: 'univer_status',
      arguments: { file: LOCKED_FILE },
      agent: owner,
    })
    assertToolError(permissionToolResult, 'FILE_PERMISSION_DENIED')
  }

  const gatewayToolResult = await toolContext.tools.execute({
    signal: new AbortController().signal,
    callId: CallId('host-smoke-gateway'),
    name: 'univer_status',
    arguments: { file: FILE },
    agent: owner,
  })
  assertToolError(gatewayToolResult, 'GATEWAY_UNAVAILABLE')
} finally {
  await toolContext.fiber.dispose()
  if (ownsGatewayBlocker) {
    await new Promise((resolve, reject) => gatewayBlocker.close((error) => error === undefined ? resolve() : reject(error)))
  }
  await new Promise((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)))
  if (canEnforcePermissionDenied) await chmod(LOCKED_DIRECTORY, 0o700)
  await rm(WORKSPACE, { recursive: true, force: true })
}

console.log('host smoke OK (Gateway errors, structured tool failures, permissions, state, user review action)')

async function json(path, init) {
  const response = await fetch(`${origin}${path}`, init)
  return { response, body: await response.json() }
}

function assertToolError(result, code) {
  if (!result.isError || result.error.info?.name !== 'UniverError' || result.error.info.code !== code) {
    throw new Error(`tool failure must retain ${code}: ${JSON.stringify(result)}`)
  }
  const content = result.content.map(block => block.type === 'text' ? block.text : '').join('')
  if (!content.startsWith(`Error [${code}]: `)) {
    throw new Error(`model-facing tool failure must include ${code}: ${JSON.stringify(result.content)}`)
  }
}

async function listenOrAcceptOccupied(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', (error) => {
      if (error?.code === 'EADDRINUSE') resolve(false)
      else reject(error)
    })
    server.listen(port, '127.0.0.1', () => resolve(true))
  })
}
