import type { JsonValue, UniverUnitKind } from '../../service/types.ts';
import { GatewayClient } from './client.ts';
/** Encode an absolute file path as the key used by the collaboration Gateway. */
export declare function fileKeyOf(file: string): string;
/** Gateway file API used by the Provider. */
export declare class GatewayFileApi {
    private readonly client;
    constructor(client: GatewayClient);
    /** Return the raw worktree listing for one file. */
    listWorktrees(file: string): Promise<JsonValue>;
    /** Return trunk Units for one file. */
    listUnits(file: string): Promise<JsonValue>;
    /** Create an empty Univer file in the bundled collaboration store. */
    create(file: string): Promise<JsonValue>;
    /** Create the first trunk Unit after the file container exists. */
    createUnit(file: string, kind: UniverUnitKind, name: string): Promise<JsonValue>;
}
//# sourceMappingURL=file-api.d.ts.map