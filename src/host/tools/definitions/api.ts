import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { UniverError } from '../../service/errors.ts'
import { apiOutput } from '../presentation.ts'

/** Create the `univer_api` tool definition. */
export function apiTool(ctx: Context) {
  return defineTool({
    name: 'univer_api',
    description: 'Look up the version-matched Univer Facade API bundled with this plugin. Use find with API-name keywords to discover ranked symbol labels, then use show with those exact labels to retrieve their reference details. Find matches indexed names, signatures, and summaries; it does not interpret task intent.',
    parameters: {
      action: {
        type: 'string',
        required: true,
        enum: ['find', 'show'],
        description: 'Use find for ranked keyword matches or show for exact symbol reference details.',
      },
      queries: {
        type: 'array',
        required: true,
        items: { type: 'string' },
        description: 'For find, one or more API-name keywords searched independently, such as setValue or FRange; do not pass a natural-language task description. For show, one or more exact class, member, type, field, or enum-value labels, such as FRange.setValue.',
      },
      unit: {
        type: 'string',
        enum: ['sheet', 'doc', 'slide', 'base', 'board'],
        description: 'Optional find-only Unit filter; shared APIs remain included.',
      },
      limit: { type: 'integer', description: 'Optional positive maximum number of matches returned for each find query.' },
    },
    output: apiOutput,
    execute(args) {
      if (args.queries.length === 0 || args.queries.some((query) => query.trim().length === 0)) {
        throw new UniverError('univer_api requires at least one non-empty query.', 'INVALID_REQUEST')
      }
      if (args.action === 'show') return ctx.univer.apiReference({ action: 'show', queries: args.queries })
      if (args.limit !== undefined && args.limit < 1) {
        throw new UniverError('univer_api limit must be a positive integer.', 'INVALID_REQUEST')
      }
      return ctx.univer.apiReference({
        action: 'find',
        queries: args.queries,
        ...args.unit === undefined ? {} : { unit: args.unit },
        ...args.limit === undefined ? {} : { limit: args.limit },
      })
    },
    presentCall: (args) => ({ card: 'generic', title: `Univer API ${args.action}: ${args.queries.join(', ')}`, kind: 'read' }),
  })
}
