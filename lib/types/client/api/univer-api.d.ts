import type { WorktreeReviewAction, WorktreeActionResult } from '../../shared/wire/actions.ts';
import type { FileState } from '../../shared/wire/state.ts';
import type { EnsureGatewayResult, UniverStatus } from '../../shared/wire/status.ts';
/** Read package, Gateway, and Unit content availability. */
export declare function getUniverStatus(): Promise<UniverStatus>;
/** Start or reuse the bundled Gateway. */
export declare function startGateway(): Promise<EnsureGatewayResult>;
/** Read one file's current collaboration state and Viewer targets. */
export declare function getFileState(file: string, sessionId: string): Promise<FileState>;
/** Apply a user-owned worktree review decision. */
export declare function performWorktreeAction(action: WorktreeReviewAction, file: string, worktreeId: string, sessionId: string): Promise<WorktreeActionResult>;
//# sourceMappingURL=univer-api.d.ts.map