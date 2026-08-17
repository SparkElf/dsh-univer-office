import type { JsonValue } from '../../service/types.ts';
import { type UnitContentWorkerRequest } from './protocol.ts';
/** Invoke one isolated package-local Unit content operation. */
export declare class UnitContentWorker {
    private readonly timeoutMs;
    constructor(timeoutMs: number);
    /** Run one request and return its JSON result. */
    run(request: UnitContentWorkerRequest, signal?: AbortSignal): Promise<JsonValue>;
}
//# sourceMappingURL=worker.d.ts.map