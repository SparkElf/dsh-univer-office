import type { Context } from '@deepseek-ai/cordis'
import type { ResolvedConfig } from '../config.ts'
import type {} from '../service/univer-service.ts'
import { createTool } from './definitions/create.ts'
import { executeTool } from './definitions/execute.ts'
import { exportTool } from './definitions/export.ts'
import { inspectTool } from './definitions/inspect.ts'
import { worktreeTool } from './definitions/worktree.ts'

export const inject = ['univer', 'tools']
export const name = 'univer-tools'

/** Register model-facing domain tools over `ctx.univer`. */
export function apply(ctx: Context, config: ResolvedConfig): void {
  ctx.tools.register(createTool(ctx, config.unitContentOperationTimeoutMs))
  ctx.tools.register(inspectTool(ctx, config.unitContentOperationTimeoutMs))
  ctx.tools.register(executeTool(ctx, config.unitContentOperationTimeoutMs))
  ctx.tools.register(exportTool(ctx, config.unitContentOperationTimeoutMs))
  ctx.tools.register(worktreeTool(ctx, config.unitContentOperationTimeoutMs))
}
