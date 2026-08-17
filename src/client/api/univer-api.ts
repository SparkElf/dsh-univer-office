import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { WorktreeReviewAction, WorktreeActionResult } from '../../shared/wire/actions.ts'
import type { FileState } from '../../shared/wire/state.ts'
import type { EnsureGatewayResult, UniverStatus } from '../../shared/wire/status.ts'

/** Error envelope returned by the Host browser API. */
interface ApiError { readonly message?: string; readonly code?: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${window.location.origin}${path}`, init)
  const body = await response.json() as T | ApiError
  if (!response.ok) {
    const error = body as ApiError
    throw new Error(error.message ?? `Univer API HTTP ${String(response.status)}`)
  }
  return body as T
}

/** Read package, Gateway, and Unit content availability. */
export function getUniverStatus(): Promise<UniverStatus> {
  return request('/univer-api/status')
}

/** Start or reuse the bundled Gateway. */
export function startGateway(): Promise<EnsureGatewayResult> {
  return request('/univer-api/gateway/start', { method: 'POST' })
}

/** Read one file's current collaboration state and Viewer targets. */
export function getFileState(file: string, sessionId: SessionId): Promise<FileState> {
  return request(`/univer-api/state?file=${encodeURIComponent(file)}&sessionId=${encodeURIComponent(sessionId)}`)
}

/** Apply a user-owned worktree review decision. */
export function performWorktreeAction(action: WorktreeReviewAction, file: string, worktreeId: string, sessionId: SessionId): Promise<WorktreeActionResult> {
  return request('/univer-api/worktree-action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, file, worktreeId, sessionId }),
  })
}
