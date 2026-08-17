import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { resolveUniverFile } from '../../provider/unit-content-operations.ts'
import { worktreeId } from '../../service/identifiers.ts'
import { operationOutput, operationTitle } from '../presentation.ts'

/** Create the `univer_execute` tool definition. */
export function executeTool(ctx: Context, timeoutMs: number) {
  return defineTool({
    name: 'univer_execute',
    description: 'Execute Univer Facade code and commit mutations to a draft agent worktree.',
    timeoutMs,
    parameters: {
      file: { type: 'string', required: true, description: 'Absolute .univer path.' },
      code: { type: 'string', required: true, description: 'Facade API JavaScript to execute.' },
      worktreeId: { type: 'string', required: true, description: 'Writable agent worktree id.' },
      unitId: { type: 'string', required: true, description: 'Target unit id.' },
    },
    output: operationOutput,
    execute: (args, exec) => ctx.univer.executeUnitContent({
      file: resolveUniverFile(args.file),
      code: args.code,
      worktreeId: worktreeId(args.worktreeId),
      unitId: args.unitId,
    }, exec.signal),
    presentCall: (args) => ({ card: 'generic', title: operationTitle('execute', args.file), kind: 'execute' }),
  })
}
