import z from '@deepseek-ai/schemastery';
/** Configuration shared by the Univer service provider and its consumers. */
export interface Config {
    /** Candidate loopback ports used by the bundled Gateway. */
    gatewayPorts?: number[];
    /** Start the bundled Gateway when file state is first requested. */
    autoStartGateway?: boolean;
    /** Maximum time allowed for the bundled Gateway to become healthy. */
    gatewayStartupTimeoutMs?: number;
    /** HTTP timeout used for Gateway state reads. */
    gatewayRequestTimeoutMs?: number;
    /** HTTP timeout used for Gateway mutations. */
    gatewayMutationTimeoutMs?: number;
    /** Maximum lifetime of a one-shot content worker process. */
    unitContentOperationTimeoutMs?: number;
    /** Maximum time to wait for a collaboration commit acknowledgement before confirming by pull. */
    unitContentCommitTimeoutMs?: number;
    /** Freshness window for file state reads. */
    stateCacheTtlMs?: number;
    /** Freshness window for changed-unit reads. */
    unitCacheTtlMs?: number;
    /** Register model-facing `univer_*` tools. */
    tools?: boolean;
}
/** Fully resolved configuration used by the implementation. */
export interface ResolvedConfig {
    readonly gatewayPorts: readonly number[];
    readonly autoStartGateway: boolean;
    readonly gatewayStartupTimeoutMs: number;
    readonly gatewayRequestTimeoutMs: number;
    readonly gatewayMutationTimeoutMs: number;
    readonly unitContentOperationTimeoutMs: number;
    readonly unitContentCommitTimeoutMs: number;
    readonly stateCacheTtlMs: number;
    readonly unitCacheTtlMs: number;
    readonly tools: boolean;
}
/** Cordis configuration schema. */
export declare const Config: z<Config>;
/** Apply defaults and reject configuration that cannot run. */
export declare function resolveConfig(config?: Config): ResolvedConfig;
//# sourceMappingURL=config.d.ts.map