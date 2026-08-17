/** A string with a domain identity that cannot be mixed with another id accidentally. */
type Branded<Base, Name extends string> = Base & {
    readonly __brand: Name;
};
/** Absolute local path of a Univer file. */
export type UniverFilePath = Branded<string, 'UniverFilePath'>;
/** Opaque collaboration worktree id. */
export type WorktreeId = Branded<string, 'WorktreeId'>;
/** Opaque Univer unit id. */
export type UnitId = Branded<string, 'UnitId'>;
/** Brand an already-validated absolute Univer path. */
export declare function univerFilePath(value: string): UniverFilePath;
/** Brand an already-validated non-empty worktree id. */
export declare function worktreeId(value: string): WorktreeId;
/** Brand an already-validated non-empty unit id. */
export declare function unitId(value: string): UnitId;
export {};
//# sourceMappingURL=identifiers.d.ts.map