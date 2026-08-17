import type { UniverOperationResult } from '../service/types.ts'

/** Output schema shared by all Univer operation tools. */
export const operationOutput = {
  schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      ok: { type: 'boolean' as const, required: true, const: true },
      operation: {
        type: 'string' as const,
        required: true,
        enum: ['create', 'inspect', 'execute', 'export', 'worktree'] as const,
      },
      file: { type: 'string' as const, required: true },
      result: { type: 'json' as const, required: true },
    },
  },
  render: (_args: unknown, value: UniverOperationResult) => [{ type: 'text' as const, text: renderOperationResult(value) }],
} as const

/** Pure text projection of a structured Univer operation result. */
export function renderOperationResult(value: UniverOperationResult): string {
  return JSON.stringify(value, null, 2)
}

/** Pure generic-card title for one Univer operation. */
export function operationTitle(operation: string, file: string): string {
  return `Univer ${operation}: ${file}`
}
