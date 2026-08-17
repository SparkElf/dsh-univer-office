import type { SessionStore } from '@deepseek-ai/dsh-session';
import type { UniverService } from '../../service/univer-service.ts';
/** Read one file's current worktree state. */
export declare function stateRoute(service: UniverService, sessions: SessionStore, file: unknown, sessionId: unknown): Promise<import("../../index.ts").FileState>;
//# sourceMappingURL=state.d.ts.map