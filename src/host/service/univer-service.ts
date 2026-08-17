import { Context, Service } from '@deepseek-ai/cordis'
import type { UniverServiceMethods } from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    univer: UniverService
  }
}

/** Service Definition for all Host-side Univer operations. */
export abstract class UniverService extends Service implements UniverServiceMethods {
  constructor(ctx: Context) {
    super(ctx, 'univer')
  }

  abstract gatewayStatus(): ReturnType<UniverServiceMethods['gatewayStatus']>
  abstract ensureGateway(): ReturnType<UniverServiceMethods['ensureGateway']>
  abstract unitContentStatus(): ReturnType<UniverServiceMethods['unitContentStatus']>
  abstract fileState(...args: Parameters<UniverServiceMethods['fileState']>): ReturnType<UniverServiceMethods['fileState']>
  abstract worktreeAction(...args: Parameters<UniverServiceMethods['worktreeAction']>): ReturnType<UniverServiceMethods['worktreeAction']>
  abstract createFile(...args: Parameters<UniverServiceMethods['createFile']>): ReturnType<UniverServiceMethods['createFile']>
  abstract inspectUnitContent(...args: Parameters<UniverServiceMethods['inspectUnitContent']>): ReturnType<UniverServiceMethods['inspectUnitContent']>
  abstract executeUnitContent(...args: Parameters<UniverServiceMethods['executeUnitContent']>): ReturnType<UniverServiceMethods['executeUnitContent']>
  abstract exportUnitContent(...args: Parameters<UniverServiceMethods['exportUnitContent']>): ReturnType<UniverServiceMethods['exportUnitContent']>
  abstract createWorktree(...args: Parameters<UniverServiceMethods['createWorktree']>): ReturnType<UniverServiceMethods['createWorktree']>
}
