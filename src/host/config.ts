import z from '@deepseek-ai/schemastery'

/** Configuration shared by the Univer service provider and its consumers. */
export interface Config {
  /** Candidate loopback ports used by the bundled Gateway. */
  gatewayPorts?: number[]
  /** Start the bundled Gateway when file state is first requested. */
  autoStartGateway?: boolean
  /** Maximum time allowed for the bundled Gateway to become healthy. */
  gatewayStartupTimeoutMs?: number
  /** HTTP timeout used for Gateway state reads. */
  gatewayRequestTimeoutMs?: number
  /** HTTP timeout used for Gateway mutations. */
  gatewayMutationTimeoutMs?: number
  /** Maximum lifetime of a one-shot content worker process. */
  unitContentOperationTimeoutMs?: number
  /** Maximum time to wait for a collaboration commit acknowledgement before confirming by pull. */
  unitContentCommitTimeoutMs?: number
  /** Freshness window for file state reads. */
  stateCacheTtlMs?: number
  /** Freshness window for changed-unit reads. */
  unitCacheTtlMs?: number
  /** Register model-facing `univer_*` tools. */
  tools?: boolean
  /** Register version-matched bundled Univer skills. */
  skills?: boolean
}

/** Fully resolved configuration used by the implementation. */
export interface ResolvedConfig {
  readonly gatewayPorts: readonly number[]
  readonly autoStartGateway: boolean
  readonly gatewayStartupTimeoutMs: number
  readonly gatewayRequestTimeoutMs: number
  readonly gatewayMutationTimeoutMs: number
  readonly unitContentOperationTimeoutMs: number
  readonly unitContentCommitTimeoutMs: number
  readonly stateCacheTtlMs: number
  readonly unitCacheTtlMs: number
  readonly tools: boolean
  readonly skills: boolean
}

/** Cordis configuration schema. */
export const Config: z<Config> = z.object({
  gatewayPorts: z.array(z.natural().max(65535)).default([9123, 8000]),
  autoStartGateway: z.boolean().default(true),
  gatewayStartupTimeoutMs: z.natural().default(10_000),
  gatewayRequestTimeoutMs: z.natural().default(3_000),
  gatewayMutationTimeoutMs: z.natural().default(60_000),
  unitContentOperationTimeoutMs: z.natural().default(120_000),
  unitContentCommitTimeoutMs: z.natural().default(5_000),
  stateCacheTtlMs: z.natural().default(1_000),
  unitCacheTtlMs: z.natural().default(5_000),
  tools: z.boolean().default(true),
  skills: z.boolean().default(true),
})

/** Apply defaults and reject configuration that cannot run. */
export function resolveConfig(config: Config = {}): ResolvedConfig {
  const resolved: ResolvedConfig = {
    gatewayPorts: config.gatewayPorts ?? [9123, 8000],
    autoStartGateway: config.autoStartGateway ?? true,
    gatewayStartupTimeoutMs: config.gatewayStartupTimeoutMs ?? 10_000,
    gatewayRequestTimeoutMs: config.gatewayRequestTimeoutMs ?? 3_000,
    gatewayMutationTimeoutMs: config.gatewayMutationTimeoutMs ?? 60_000,
    unitContentOperationTimeoutMs: config.unitContentOperationTimeoutMs ?? 120_000,
    unitContentCommitTimeoutMs: config.unitContentCommitTimeoutMs ?? 5_000,
    stateCacheTtlMs: config.stateCacheTtlMs ?? 1_000,
    unitCacheTtlMs: config.unitCacheTtlMs ?? 5_000,
    tools: config.tools ?? true,
    skills: config.skills ?? true,
  }
  if (resolved.gatewayPorts.length === 0) throw new Error('univer: gatewayPorts must not be empty')
  for (const port of resolved.gatewayPorts) {
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      throw new Error('univer: every Gateway port must be an integer between 1 and 65535')
    }
  }
  for (const [name, value] of Object.entries({
    gatewayStartupTimeoutMs: resolved.gatewayStartupTimeoutMs,
    gatewayRequestTimeoutMs: resolved.gatewayRequestTimeoutMs,
    gatewayMutationTimeoutMs: resolved.gatewayMutationTimeoutMs,
    unitContentOperationTimeoutMs: resolved.unitContentOperationTimeoutMs,
    unitContentCommitTimeoutMs: resolved.unitContentCommitTimeoutMs,
    stateCacheTtlMs: resolved.stateCacheTtlMs,
    unitCacheTtlMs: resolved.unitCacheTtlMs,
  })) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`univer: ${name} must be a positive integer`)
  }
  return resolved
}
