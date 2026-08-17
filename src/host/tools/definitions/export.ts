import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { resolveUniverFile } from '../../provider/unit-content-operations.ts'
import { worktreeId } from '../../service/identifiers.ts'
import { operationOutput, operationTitle } from '../presentation.ts'

/** Create the `univer_export` tool definition. */
export function exportTool(ctx: Context, timeoutMs: number) {
  return defineTool({
    name: 'univer_export',
    description: 'Export a .univer document or unit to a user-facing file format.',
    timeoutMs,
    parameters: {
      file: { type: 'string', required: true, description: 'Absolute .univer path.' },
      output: { type: 'string', required: true, description: 'Absolute output file path.' },
      unitId: { type: 'string', description: 'Optional unit id.' },
      worktreeId: { type: 'string', description: 'Optional worktree scope; omit to export trunk.' },
    },
    output: operationOutput,
    execute: (args, exec) => ctx.univer.exportUnitContent({
      file: resolveUniverFile(args.file),
      output: args.output,
      ...args.unitId === undefined ? {} : { unitId: args.unitId },
      ...args.worktreeId === undefined ? {} : { worktreeId: worktreeId(args.worktreeId) },
    }, exec.signal),
    presentCall: (args) => ({ card: 'generic', title: operationTitle('export', args.file), kind: 'execute' }),
  })
}
