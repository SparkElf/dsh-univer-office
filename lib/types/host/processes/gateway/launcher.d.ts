import type { SpawnOptions } from 'node:child_process';
/** Build the fixed executable and environment used for a bundled Gateway. */
export declare function gatewayLaunch(port: number): {
    readonly command: string;
    readonly args: readonly string[];
    readonly options: SpawnOptions;
};
//# sourceMappingURL=launcher.d.ts.map