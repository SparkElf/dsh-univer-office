import type { FileState } from './state.ts'

/** Human-only worktree review decisions exposed by the browser UI. */
export type WorktreeReviewAction = 'ready' | 'reopen' | 'discard' | 'merge'

/** Result of one worktree review decision. */
export type WorktreeActionResult =
  | {
    readonly ok: true
    readonly action: WorktreeReviewAction
    readonly worktreeId: string
    readonly state: FileState
  }
  | { readonly ok: false; readonly reason: string; readonly state?: FileState }
