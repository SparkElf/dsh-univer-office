import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SessionStore } from '@deepseek-ai/dsh-session';
import type { UniverService } from '../service/univer-service.ts';
/** Create the `/univer-api` HTTP dispatcher. */
export declare function createUniverRouter(service: UniverService, sessions: SessionStore): (request: IncomingMessage, response: ServerResponse) => Promise<void>;
/** Send a JSON response with no browser cache. */
export declare function sendJson(response: ServerResponse, status: number, value: unknown): void;
//# sourceMappingURL=router.d.ts.map