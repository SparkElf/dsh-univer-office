import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { resolveUniverFile } from '../../provider/unit-content-operations.ts'
import { operationOutput, operationTitle } from '../presentation.ts'

/** Create the agent-safe `univer_worktree` tool definition. */
export function worktreeTool(ctx: Context, timeoutMs: number) {
  return defineTool({
    name: 'univer_worktree',
    description: 'Create an isolated Univer worktree for agent edits. User review actions such as merge and discard are intentionally unavailable.',
    timeoutMs,
    parameters: {
      file: { type: 'string', required: true, description: 'Absolute .univer path.' },
      name: { type: 'string', description: 'Optional human-readable worktree name.' },
    },
    output: operationOutput,
    execute: (args, exec) => ctx.univer.createWorktree(resolveUniverFile(args.file), args.name, exec.signal),
    presentCall: (args) => ({ card: 'generic', title: operationTitle('worktree', args.file), kind: 'execute' }),
  })
}
