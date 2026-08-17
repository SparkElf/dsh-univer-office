import type { FileState } from '../../shared/wire/state.ts';
/** Poll collaboration state for a stable list of files. */
export declare function useUniverStates(files: readonly string[], sessionId: string, intervalMs?: number): {
    readonly states: Readonly<Record<string, FileState>>;
    readonly applyState: (state: FileState) => void;
};
/** Gateway state and start action used by preview surfaces. */
export declare function useGatewayStatus(): {
    readonly phase: 'checking' | 'stopped' | 'starting' | 'running' | 'failed';
    readonly start: () => Promise<void>;
};
//# sourceMappingURL=use-univer-state.d.ts.map