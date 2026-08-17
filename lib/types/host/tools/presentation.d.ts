import type { UniverOperationResult } from '../service/types.ts';
/** Output schema shared by all Univer operation tools. */
export declare const operationOutput: {
    readonly schema: {
        readonly type: 'object';
        readonly additionalProperties: false;
        readonly properties: {
            readonly ok: {
                readonly type: 'boolean';
                readonly required: true;
                readonly const: true;
            };
            readonly operation: {
                readonly type: 'string';
                readonly required: true;
                readonly enum: readonly ['create', 'inspect', 'execute', 'export', 'worktree'];
            };
            readonly file: {
                readonly type: 'string';
                readonly required: true;
            };
            readonly result: {
                readonly type: 'json';
                readonly required: true;
            };
        };
    };
    readonly render: (_args: unknown, value: UniverOperationResult) => {
        type: 'text';
        text: string;
    }[];
};
/** Pure text projection of a structured Univer operation result. */
export declare function renderOperationResult(value: UniverOperationResult): string;
/** Pure generic-card title for one Univer operation. */
export declare function operationTitle(operation: string, file: string): string;
//# sourceMappingURL=presentation.d.ts.map