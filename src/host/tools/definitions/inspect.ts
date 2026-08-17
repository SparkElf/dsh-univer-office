import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { resolveUniverFile } from '../../provider/unit-content-operations.ts'
import { worktreeId } from '../../service/identifiers.ts'
import { operationOutput, operationTitle } from '../presentation.ts'

/** Create the `univer_inspect` tool definition. */
export function inspectTool(ctx: Context, timeoutMs: number) {
  return defineTool({
    name: 'univer_inspect',
    description: 'Inspect structured content from a .univer document, optionally narrowed to a unit or range.',
    timeoutMs,
    parameters: {
      file: { type: 'string', required: true, description: 'Absolute .univer path.' },
      unitId: { type: 'string', description: 'Optional unit id.' },
      range: { type: 'string', description: 'Optional unit range such as Sheet1!A1:D20.' },
      worktreeId: { type: 'string', description: 'Optional worktree scope; omit to inspect trunk.' },
    },
    output: operationOutput,
    execute: (args, exec) => ctx.univer.inspectUnitContent({
      file: resolveUniverFile(args.file),
      ...args.unitId === undefined ? {} : { unitId: args.unitId },
      ...args.range === undefined ? {} : { range: args.range },
      ...args.worktreeId === undefined ? {} : { worktreeId: worktreeId(args.worktreeId) },
    }, exec.signal),
    presentCall: (args) => ({ card: 'generic', title: operationTitle('inspect', args.file), kind: 'read' }),
  })
}
