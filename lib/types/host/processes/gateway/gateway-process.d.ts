import type { EnsureGatewayResult } from '../../../shared/wire/status.ts';
/** One plugin-owned Gateway child process. */
export declare class GatewayProcess {
    private child;
    /** Start on one port and wait until the Viewer health endpoint responds. */
    start(port: number, startupTimeoutMs: number, probeTimeoutMs: number): Promise<EnsureGatewayResult>;
    /** Stop only the child process this instance created. */
    stop(): Promise<void>;
}
//# sourceMappingURL=gateway-process.d.ts.map