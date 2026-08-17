import type { WorktreeReviewAction } from '../../../shared/wire/actions.ts';
import type { JsonValue } from '../../service/types.ts';
import { GatewayClient } from './client.ts';
/** Gateway worktree API used by the Provider. */
export declare class GatewayWorktreeApi {
    private readonly client;
    constructor(client: GatewayClient);
    /** Return merge-preview metadata for one worktree. */
    preview(file: string, worktreeId: string): Promise<JsonValue>;
    /** Create an isolated worktree for agent edits. */
    create(file: string, name: string | undefined): Promise<JsonValue>;
    /** Return Units visible inside one worktree. */
    listUnits(file: string, worktreeId: string): Promise<JsonValue>;
    /** Apply one human review decision. */
    action(file: string, worktreeId: string, action: WorktreeReviewAction): Promise<JsonValue>;
}
//# sourceMappingURL=worktree-api.d.ts.map