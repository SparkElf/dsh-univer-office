import type { SessionSnapshot } from '../dsh.ts';
/** One preview target recovered from durable conversation events. */
export interface UniverTarget {
    readonly file: string;
    readonly worktreeId: string | null;
}
/** Turn-local state stored by the DSH conversation event engine. */
export interface UniverTurnData {
    readonly turn: unknown;
    readonly targets: readonly UniverTarget[];
}
interface EventEnvelope {
    readonly type: string;
    readonly data: Record<string, unknown>;
}
interface DefinitionContext {
    readonly state: UniverTurnData;
}
interface DefinitionMatch {
    readonly event: EventEnvelope;
}
/** Conversation definition that projects tool calls/results into preview targets. */
export declare const univerTargetDefinition: {
    kind: string;
    match(event: EventEnvelope): {
        id: string;
        role: string;
    } | null;
    start(_context: unknown, match: DefinitionMatch): UniverTurnData;
    update(context: DefinitionContext, match: DefinitionMatch): UniverTurnData;
    buildLocationData(context: {
        readonly state?: UniverTurnData;
    }, scope: string): {
        kind: string;
        turn: unknown;
        key: string;
        value: {
            targets: readonly UniverTarget[];
        };
    } | null;
};
/** Select a turn-tail preview only for turns containing Univer targets. */
export declare function selectUniverPreview(owner: {
    readonly turn: {
        readonly data: Map<string, unknown>;
    };
}): {
    targets: readonly UniverTarget[];
} | null;
/** Recover all unique target files and mentioned worktrees from a session. */
export declare function targetsOfSession(session: SessionSnapshot | null, cwd?: string): {
    readonly files: string[];
    readonly worktreeIds: Set<string>;
};
export declare function basename(file: string): string;
export {};
//# sourceMappingURL=univer-target-definition.d.ts.map