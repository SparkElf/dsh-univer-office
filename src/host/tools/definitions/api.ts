import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { UniverError } from '../../service/errors.ts'
import { apiOutput } from '../presentation.ts'

/** Create the `univer_api` tool definition. */
export function apiTool(ctx: Context) {
  return defineTool({
    name: 'univer_api',
    description: 'Bundled Univer Facade API reference. FIND only when no class or exact Class.member/type label is known; use one short API-name query, not synonyms. Find is case-insensitive, and queries produce separate results rather than AND or intent search. After any useful find result, the next lookup must be SHOW; repeat find only after zero useful matches. SHOW a known class to inspect its APIs, or show a known type/exact label. Never find members of a known class. Use shown signatures and examples directly, and stop when they contain the required call chain.',
    parameters: {
      action: {
        type: 'string',
        required: true,
        enum: ['find', 'show'],
        description: 'find discovers an unknown label. show inspects a known class, type, or exact Class.member label. If a class is known, choose show.',
      },
      queries: {
        type: 'array',
        required: true,
        items: { type: 'string' },
        description: 'find: one short API-name query per unknown concept, such as conditionalFormat; do not batch synonyms. Items run independently, not as AND. show: known class, type, or exact Class.member labels such as FRange or FRange.setValue.',
      },
      unit: {
        type: 'string',
        enum: ['sheet', 'doc', 'slide', 'base', 'board'],
        description: 'Optional find-only Unit filter; shared APIs remain included.',
      },
      limit: { type: 'integer', description: 'Find-only maximum matches per query. Prefer 10 or fewer.' },
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
