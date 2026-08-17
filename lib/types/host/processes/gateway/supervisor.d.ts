import type { ResolvedConfig } from '../../config.ts';
import type { EnsureGatewayResult, GatewayStatus } from '../../../shared/wire/status.ts';
/** Own the lifecycle of the package's Gateway process. */
export declare class GatewaySupervisor {
    private readonly config;
    private readonly process;
    private starting;
    private lastFailure;
    private ownedGateway;
    constructor(config: ResolvedConfig);
    /** Return current Gateway availability without starting it. */
    status(): Promise<GatewayStatus>;
    /** Reuse this supervisor's healthy Gateway or start the vendored one once for concurrent callers. */
    ensure(): Promise<EnsureGatewayResult>;
    private start;
    /** Stop the plugin-owned process and forget Gateway state. */
    dispose(): Promise<void>;
}
//# sourceMappingURL=supervisor.d.ts.map