import { UniverError } from '../../service/errors.ts'
import type { JsonValue } from '../../service/types.ts'

/** Small typed transport over the bundled Gateway HTTP API. */
export class GatewayClient {
  constructor(readonly origin: string, private readonly timeoutMs: number) {}

  /** Execute a JSON GET request. */
  async get(path: string): Promise<JsonValue> {
    return this.request(path, 'GET')
  }

  /** Execute a JSON POST request. */
  async post(path: string, body: JsonValue = {}): Promise<JsonValue> {
    return this.request(path, 'POST', body)
  }

  private async request(path: string, method: 'GET' | 'POST', body?: JsonValue): Promise<JsonValue> {
    const response = await fetch(`${this.origin}${path}`, {
      method,
      ...body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    let value: JsonValue
    try {
      value = await response.json() as JsonValue
    } catch (error) {
      throw new UniverError(`Gateway returned invalid JSON for ${method} ${path}`, 'GATEWAY_INVALID_RESPONSE', { cause: error })
    }
    if (!response.ok) {
      const message = gatewayErrorMessage(value) ?? `Gateway HTTP ${String(response.status)}`
      throw new UniverError(message, 'GATEWAY_REQUEST_FAILED')
    }
    return value
  }
}

/** Extract a stable user-facing message from a Gateway error envelope. */
export function gatewayErrorMessage(value: JsonValue): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const error = value.error
  if (typeof error !== 'object' || error === null || Array.isArray(error)) return null
  return typeof error.message === 'string' && error.message.length > 0 ? error.message : null
}
