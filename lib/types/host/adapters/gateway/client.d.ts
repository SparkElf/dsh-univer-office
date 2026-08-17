import type { JsonValue } from '../../service/types.ts';
/** Small typed transport over the bundled Gateway HTTP API. */
export declare class GatewayClient {
    readonly origin: string;
    private readonly timeoutMs;
    constructor(origin: string, timeoutMs: number);
    /** Execute a JSON GET request. */
    get(path: string): Promise<JsonValue>;
    /** Execute a JSON POST request. */
    post(path: string, body?: JsonValue): Promise<JsonValue>;
    private request;
}
/** Extract a stable user-facing message from a Gateway error envelope. */
export declare function gatewayErrorMessage(value: JsonValue): string | null;
//# sourceMappingURL=client.d.ts.map