import type { SessionStore } from '@deepseek-ai/dsh-session';
import type { WorktreeReviewAction } from '../../../shared/wire/actions.ts';
import type { UniverService } from '../../service/univer-service.ts';
/** Parsed worktree action request body. */
export interface WorktreeActionBody {
    readonly action: WorktreeReviewAction;
    readonly file: string;
    readonly sessionId: string;
    readonly worktreeId: string;
}
/** Validate and execute one browser-owned worktree review action. */
export declare function worktreeActionRoute(service: UniverService, sessions: SessionStore, body: unknown): Promise<import("../../../shared/wire/actions.ts").WorktreeActionResult>;
//# sourceMappingURL=worktree-action.d.ts.map