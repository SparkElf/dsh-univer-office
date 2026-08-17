import type { Context } from '@deepseek-ai/cordis'
import type { ResolvedConfig } from '../config.ts'
import type {} from '../service/univer-service.ts'
import { apiTool } from './definitions/api.ts'
import { compileSvgTool } from './definitions/compile-svg.ts'
import { executeTool } from './definitions/execute.ts'
import { exportTool } from './definitions/export.ts'
import { importTool } from './definitions/import.ts'
import { inspectTool } from './definitions/inspect.ts'
import { lintTool } from './definitions/lint.ts'
import { newTool } from './definitions/new.ts'
import { statusTool } from './definitions/status.ts'
import { unitTool } from './definitions/unit.ts'
import { worktreeTool } from './definitions/worktree.ts'

export const inject = ['univer', 'tools']
export const name = 'univer-tools'

/** Register model-facing domain tools over `ctx.univer`. */
export function apply(ctx: Context, config: ResolvedConfig): void {
  const gatewayReadTimeoutMs = config.gatewayStartupTimeoutMs + config.gatewayRequestTimeoutMs
  const gatewayWriteTimeoutMs = config.gatewayStartupTimeoutMs + config.gatewayMutationTimeoutMs
  const unitContentTimeoutMs = config.gatewayStartupTimeoutMs + config.unitContentOperationTimeoutMs
  ctx.tools.register(newTool(ctx, gatewayWriteTimeoutMs))
  ctx.tools.register(statusTool(ctx, gatewayReadTimeoutMs))
  ctx.tools.register(worktreeTool(ctx, gatewayWriteTimeoutMs))
  ctx.tools.register(unitTool(ctx, gatewayWriteTimeoutMs))
  ctx.tools.register(importTool(ctx, unitContentTimeoutMs))
  ctx.tools.register(inspectTool(ctx, unitContentTimeoutMs))
  ctx.tools.register(executeTool(ctx, unitContentTimeoutMs))
  ctx.tools.register(exportTool(ctx, unitContentTimeoutMs))
  ctx.tools.register(lintTool(ctx, unitContentTimeoutMs))
  ctx.tools.register(compileSvgTool(ctx, unitContentTimeoutMs))
  ctx.tools.register(apiTool(ctx))
  ctx.on('tools/pre-execute', (exec, next) => {
    if (exec.name !== 'univer_worktree' || !isRecord(exec.arguments)) return next()
    const action = exec.arguments.action
    if (action !== 'merge' && action !== 'discard') return next()
    return Promise.resolve({
      kind: 'ask',
      reason: action === 'merge'
        ? 'Merging publishes the selected Univer worktree into trunk.'
        : 'Discarding permanently removes the selected Univer worktree changes.',
    })
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
