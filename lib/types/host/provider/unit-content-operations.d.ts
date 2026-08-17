import type { ExportUnitContentRequest, InspectUnitContentRequest, UniverOperationResult } from '../service/types.ts';
/** Validate a file value at the service boundary. */
export declare function resolveUniverFile(value: string): import("../service/identifiers.ts").UniverFilePath;
/** Validate a user-facing export target. */
export declare function resolveExportFile(value: string): string;
/** Package-local Unit content operations over one Gateway and isolated workers. */
export declare class UnitContentOperations {
    private readonly gatewayRequestTimeoutMs;
    private readonly unitContentCommitTimeoutMs;
    private readonly worker;
    constructor(gatewayRequestTimeoutMs: number, unitContentCommitTimeoutMs: number, unitContentOperationTimeoutMs: number);
    /** Inspect one file, unit, or Sheet range. */
    inspect(gateway: string, request: InspectUnitContentRequest, signal?: AbortSignal): Promise<UniverOperationResult>;
    /** Execute Facade code and commit its mutations to a draft worktree. */
    execute(gateway: string, file: string, code: string, worktreeId: string, unitId: string, signal?: AbortSignal): Promise<UniverOperationResult>;
    /** Export one Unit to a user-facing Office or delimited file. */
    export(gateway: string, request: ExportUnitContentRequest, signal?: AbortSignal): Promise<UniverOperationResult>;
    private resolveTarget;
}
//# sourceMappingURL=unit-content-operations.d.ts.map