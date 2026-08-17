import type { UniverApiResult, UniverOperationResult } from '../service/types.ts'

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
        enum: ['new', 'status', 'inspect', 'execute', 'import', 'export', 'lint', 'compile-svg', 'unit', 'worktree'] as const,
      },
      file: { type: 'string' as const, required: true },
      result: { type: 'json' as const, required: true },
    },
  },
  render: (_args: unknown, value: UniverOperationResult) => [{ type: 'text' as const, text: renderOperationResult(value) }],
} as const

/** Output schema for version-matched Facade reference reads. */
export const apiOutput = {
  schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      ok: { type: 'boolean' as const, required: true, const: true },
      operation: { type: 'string' as const, required: true, const: 'api' },
      result: { type: 'json' as const, required: true },
    },
  },
  render: (_args: unknown, value: UniverApiResult) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
} as const

/** Pure text projection of a structured Univer operation result. */
export function renderOperationResult(value: UniverOperationResult): string {
  return JSON.stringify(value, null, 2)
}

/** Pure generic-card title for one Univer operation. */
export function operationTitle(operation: string, file: string): string {
  return `Univer ${operation}: ${file}`
}
