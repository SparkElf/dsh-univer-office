import type { JsonValue } from '../../service/types.ts';
/** Unit and collaboration scope passed to the package-local worker. */
export interface UnitContentWorkerTarget {
    readonly gatewayOrigin: string;
    readonly commitTimeoutMs: number;
    readonly fileKey: string;
    readonly filePath: string;
    readonly unitId: string;
    readonly unitType: number;
    readonly worktreeId?: string;
}
/** Inspection query understood by the vendored SDK inspector. */
export type UnitContentInspectionQuery = {
    readonly kind: 'workbook';
} | {
    readonly kind: 'presentation';
} | {
    readonly kind: 'document';
} | {
    readonly kind: 'worksheet-range';
    readonly ranges: readonly [{
        readonly range: string;
        readonly worksheet: {
            readonly name: string;
        } | {
            readonly index: number;
        };
    }];
};
/** One operation accepted by the package-local worker. */
export type UnitContentWorkerRequest = (UnitContentWorkerTarget & {
    readonly operation: 'inspect';
    readonly query: UnitContentInspectionQuery;
}) | (UnitContentWorkerTarget & {
    readonly operation: 'execute';
    readonly code: string;
    readonly worktreeId: string;
}) | (UnitContentWorkerTarget & {
    readonly operation: 'export';
    readonly outputPath: string;
});
/** Process response envelope emitted once on stdout. */
export type UnitContentWorkerEnvelope = {
    readonly ok: true;
    readonly result: JsonValue;
} | {
    readonly ok: false;
    readonly error: {
        readonly code: string;
        readonly message: string;
    };
};
/** Validate the untrusted process response. */
export declare function parseUnitContentWorkerEnvelope(value: unknown): UnitContentWorkerEnvelope | null;
//# sourceMappingURL=protocol.d.ts.map