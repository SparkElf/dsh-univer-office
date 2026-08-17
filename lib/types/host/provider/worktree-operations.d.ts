import type { WorktreeReviewAction } from '../../shared/wire/actions.ts';
import type { ChangedUnit } from '../../shared/wire/state.ts';
/** Worktree reads and mutations over the package-local Gateway. */
export declare class WorktreeOperations {
    private readonly gatewayTimeoutMs;
    private readonly gatewayMutationTimeoutMs;
    constructor(gatewayTimeoutMs: number, gatewayMutationTimeoutMs: number);
    /** Read changed units from the Gateway merge preview. */
    changedUnits(gateway: string, file: string, worktreeId: string): Promise<ChangedUnit[]>;
    /** Apply one human review action through Gateway. */
    action(gateway: string, file: string, worktreeId: string, action: WorktreeReviewAction): Promise<void>;
}
//# sourceMappingURL=worktree-operations.d.ts.map