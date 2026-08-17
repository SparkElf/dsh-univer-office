/** Probe one Gateway origin and return whether its Viewer endpoint is healthy. */
export declare function gatewayIsHealthy(origin: string, timeoutMs: number): Promise<boolean>;
/** Return the first healthy Gateway origin from the configured ports. */
export declare function probeGateway(ports: readonly number[], timeoutMs: number): Promise<string | null>;
//# sourceMappingURL=protocol.d.ts.map