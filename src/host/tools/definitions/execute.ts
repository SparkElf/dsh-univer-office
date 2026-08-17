import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { unitId, worktreeId } from '../../service/identifiers.ts'
import { operationOutput, operationTitle } from '../presentation.ts'
import { existingToolFile } from '../workspace.ts'

/** Create the `univer_execute` tool definition. */
export function executeTool(ctx: Context, timeoutMs: number) {
  return defineTool({
    name: 'univer_execute',
    description: 'Execute Univer Facade code and commit mutations to a draft agent worktree.',
    timeoutMs,
    parameters: {
      file: { type: 'string', required: true, description: 'Workspace-relative or absolute .univer path.' },
      code: { type: 'string', required: true, description: 'Facade API JavaScript to execute.' },
      worktreeId: { type: 'string', required: true, description: 'Writable agent worktree id.' },
      unitId: { type: 'string', required: true, description: 'Target unit id.' },
    },
    output: operationOutput,
    async execute(args, exec) {
      const target = await existingToolFile(exec, args.file)
      return ctx.univer.executeUnitContent({
        workspace: target.workspace,
        file: target.path,
        code: args.code,
        worktreeId: worktreeId(args.worktreeId),
        unitId: unitId(args.unitId),
      }, exec.signal)
    },
    presentCall: (args) => ({ card: 'generic', title: operationTitle('execute', args.file), kind: 'execute' }),
  })
}
