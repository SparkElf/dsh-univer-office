import type { ChangedUnit, WorktreeStatus } from '../../../shared/wire/state.ts';
import type { JsonValue } from '../../service/types.ts';
/** Gateway collaboration record after validation. */
export interface GatewayWorktree {
    readonly worktreeId: string;
    readonly name: string;
    readonly status: WorktreeStatus;
}
/** Unit record returned by trunk and worktree listings. */
export interface GatewayUnit {
    readonly unitId: string;
    readonly name: string;
    readonly type: number;
}
/** Validate and map a Gateway worktree listing. */
export declare function mapWorktrees(value: JsonValue): GatewayWorktree[];
/** Validate and map a Gateway Unit listing. */
export declare function mapUnits(value: JsonValue): GatewayUnit[];
/** Validate and map changed units from a Gateway merge preview. */
export declare function mapChangedUnits(value: JsonValue): ChangedUnit[];
/** Determine whether a JSON value is a string-keyed object. */
export declare function isRecord(value: JsonValue | undefined): value is {
    [key: string]: JsonValue;
};
//# sourceMappingURL=mapping.d.ts.map