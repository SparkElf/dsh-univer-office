import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { resolveUniverFile } from '../../provider/unit-content-operations.ts'
import { operationOutput, operationTitle } from '../presentation.ts'

/** Create the `univer_create` tool definition. */
export function createTool(ctx: Context, timeoutMs: number) {
  return defineTool({
    name: 'univer_create',
    description: 'Create a .univer document with its first Unit at an absolute path.',
    timeoutMs,
    parameters: {
      file: { type: 'string', required: true, description: 'Absolute output path ending in .univer.' },
      kind: {
        type: 'string',
        required: true,
        enum: ['sheet', 'doc', 'slide', 'base', 'board'],
        description: 'Type of the first Unit.',
      },
      name: { type: 'string', required: true, description: 'Name of the first Unit.' },
    },
    output: operationOutput,
    execute: (args, exec) => ctx.univer.createFile({
      file: resolveUniverFile(args.file),
      kind: args.kind,
      name: args.name,
    }, exec.signal),
    presentCall: (args) => ({ card: 'generic', title: operationTitle('create', args.file), kind: 'execute' }),
  })
}
