import type { WorktreeReviewAction, WorktreeActionResult } from '../../shared/wire/actions.ts';
/** Serialize user review actions and expose their current state. */
export declare function useWorktreeAction(file: string, worktreeId: string, sessionId: string): {
    readonly busy: WorktreeReviewAction | null;
    readonly error: string | null;
    readonly perform: (action: WorktreeReviewAction) => Promise<WorktreeActionResult | null>;
};
//# sourceMappingURL=use-worktree-action.d.ts.map