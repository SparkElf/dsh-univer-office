import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { UniverError } from '../../service/errors.ts'
import { apiOutput } from '../presentation.ts'

/** Create the `univer_api` tool definition. */
export function apiTool(ctx: Context) {
  return defineTool({
    name: 'univer_api',
    description: 'Search or show the exact Univer Facade API bundled with this plugin. Use find by intent, then show exact symbols before writing unfamiliar Facade code.',
    parameters: {
      action: { type: 'string', required: true, enum: ['find', 'show'], description: 'Reference operation.' },
      queries: { type: 'array', required: true, items: { type: 'string' }, description: 'Search terms for find or exact symbols for show.' },
      unit: { type: 'string', enum: ['sheet', 'doc', 'slide'], description: 'Optional find filter.' },
      limit: { type: 'integer', description: 'Optional positive per-query find limit.' },
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
