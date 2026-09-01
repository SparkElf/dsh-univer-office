import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { operationOutput, operationTitle } from '../presentation.ts'
import { newToolFile, templateToolFile } from '../workspace.ts'

/** Create the `univer_new` tool definition. */
export function newTool(ctx: Context, timeoutMs: number) {
  return defineTool({
    name: 'univer_new',
    description: 'Create a new .univer file in the current workspace, either empty or from an existing .univer template. This never overwrites an existing file.',
    timeoutMs,
    parameters: {
      file: { type: 'string', required: true, description: 'Workspace-relative or absolute output path ending in .univer.' },
      templateFile: {
        type: 'string',
        description: 'Optional existing .univer template inside the current workspace or a trusted registered template root. The complete file is copied, including its Units and document layout.',
      },
    },
    output: operationOutput,
    async execute(args, exec) {
      const target = await newToolFile(exec, args.file)
      const templateFile = args.templateFile === undefined ? undefined : await templateToolFile(exec, args.templateFile)
      return ctx.univer.newFile(
        {
          workspace: target.workspace,
          file: target.path,
          ...(templateFile === undefined ? {} : { templateFile }),
        },
        exec.signal,
      )
    },
    presentCall: (args) => ({ card: 'generic', title: operationTitle('new', args.file), kind: 'execute' }),
  })
}
