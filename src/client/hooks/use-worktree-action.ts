import * as React from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { WorktreeReviewAction, WorktreeActionResult } from '../../shared/wire/actions.ts'
import { performWorktreeAction } from '../api/univer-api.ts'

/** Serialize user review actions and expose their current state. */
export function useWorktreeAction(file: string, worktreeId: string, sessionId: SessionId): {
  readonly busy: WorktreeReviewAction | null
  readonly error: string | null
  readonly perform: (action: WorktreeReviewAction) => Promise<WorktreeActionResult | null>
} {
  const [busy, setBusy] = React.useState<WorktreeReviewAction | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const perform = React.useCallback(async (action: WorktreeReviewAction) => {
    if (busy !== null) return null
    setBusy(action)
    setError(null)
    try {
      const result = await performWorktreeAction(action, file, worktreeId, sessionId)
      if (!result.ok) setError(result.reason)
      return result
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      return null
    } finally {
      setBusy(null)
    }
  }, [busy, file, worktreeId, sessionId])
  return { busy, error, perform }
}
