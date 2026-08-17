import type { Context } from '@deepseek-ai/cordis';
import type { Config as UniverConfig } from './config.ts';
export { Config, resolveConfig } from './config.ts';
export type { UniverConfig };
export { GatewayUniverService } from './provider/gateway-univer-service.ts';
export { UniverService } from './service/univer-service.ts';
export { createUniverRouter } from './webServer/router.ts';
export * from '../shared/wire/actions.ts';
export * from '../shared/wire/state.ts';
export * from '../shared/wire/status.ts';
export declare const name = "dsh-univer-plugin";
/** Compose the Univer Provider and its Web/Tools Consumers. */
export declare function apply(ctx: Context, config?: UniverConfig): void;
//# sourceMappingURL=index.d.ts.map