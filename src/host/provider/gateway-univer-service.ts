import type { Context } from '@deepseek-ai/cordis'
import type { ResolvedConfig } from '../config.ts'
import type { WorktreeActionResult } from '../../shared/wire/actions.ts'
import type { FileState, WorktreeState } from '../../shared/wire/state.ts'
import type { EnsureGatewayResult, GatewayStatus } from '../../shared/wire/status.ts'
import { GatewayClient } from '../adapters/gateway/client.ts'
import { GatewayFileApi, fileKeyOf } from '../adapters/gateway/file-api.ts'
import { GatewayWorktreeApi } from '../adapters/gateway/worktree-api.ts'
import { mapWorktrees } from '../adapters/gateway/mapping.ts'
import type { CreateUniverFileRequest, ExecuteUnitContentRequest, ExportUnitContentRequest, FileStateRequest, InspectUnitContentRequest, UniverOperationResult, WorktreeActionRequest } from '../service/types.ts'
import type { UniverFilePath } from '../service/identifiers.ts'
import { UniverError } from '../service/errors.ts'
import { UniverService } from '../service/univer-service.ts'
import { GatewaySupervisor } from '../processes/gateway/supervisor.ts'
import { UnitContentOperations } from './unit-content-operations.ts'
import { StateCache } from './state-cache.ts'
import { WorktreeOperations } from './worktree-operations.ts'

/** Local Service Provider backed by the bundled Gateway and Unit content worker. */
export class GatewayUniverService extends UniverService {
  private readonly gatewaySupervisor: GatewaySupervisor
  private readonly unitContent: UnitContentOperations
  private readonly worktrees: WorktreeOperations
  private readonly stateCache: StateCache<string, FileState>
  private readonly unitCache: StateCache<string, readonly import('../../shared/wire/state.ts').ChangedUnit[]>

  constructor(ctx: Context, private readonly config: ResolvedConfig) {
    super(ctx)
    this.gatewaySupervisor = new GatewaySupervisor(config)
    this.unitContent = new UnitContentOperations(
      config.gatewayRequestTimeoutMs,
      config.unitContentCommitTimeoutMs,
      config.unitContentOperationTimeoutMs,
    )
    this.worktrees = new WorktreeOperations(config.gatewayRequestTimeoutMs, config.gatewayMutationTimeoutMs)
    this.stateCache = new StateCache(config.stateCacheTtlMs)
    this.unitCache = new StateCache(config.unitCacheTtlMs)
    ctx.effect(() => async () => this.dispose(), 'univer: Gateway supervisor')
  }

  /** Current Gateway status. */
  gatewayStatus(): Promise<GatewayStatus> {
    return this.gatewaySupervisor.status()
  }

  /** Ensure the bundled Gateway is available. */
  ensureGateway(): Promise<EnsureGatewayResult> {
    return this.gatewaySupervisor.ensure()
  }

  /** Return cached collaboration state for one file. */
  fileState(request: FileStateRequest): Promise<FileState> {
    return this.stateCache.get(request.file, () => this.computeFileState(request.file))
  }

  /** Apply a human review decision and return the refreshed state. */
  async worktreeAction(request: WorktreeActionRequest): Promise<WorktreeActionResult> {
    const available = await this.ensureGateway()
    if (!available.ok) return { ok: false, reason: available.reason }
    try {
      await this.worktrees.action(available.gateway, request.file, request.worktreeId, request.action)
      this.invalidate(request.file, request.worktreeId)
      return {
        ok: true,
        action: request.action,
        worktreeId: request.worktreeId,
        state: await this.fileState({ file: request.file }),
      }
    } catch (error) {
      this.invalidate(request.file, request.worktreeId)
      const state = await this.fileState({ file: request.file }).catch(() => undefined)
      return {
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
        ...state === undefined ? {} : { state },
      }
    }
  }

  createFile(request: CreateUniverFileRequest, signal?: AbortSignal): Promise<UniverOperationResult> {
    return this.createFileInGateway(request, signal)
  }

  async inspectUnitContent(request: InspectUnitContentRequest, signal?: AbortSignal): Promise<UniverOperationResult> {
    const gateway = await this.requireGateway()
    return this.unitContent.inspect(gateway, request, signal)
  }

  async executeUnitContent(request: ExecuteUnitContentRequest, signal?: AbortSignal): Promise<UniverOperationResult> {
    const gateway = await this.requireGateway()
    const result = await this.unitContent.execute(gateway, request.file, request.code, request.worktreeId, request.unitId, signal)
    this.invalidate(request.file, request.worktreeId)
    return result
  }

  async exportUnitContent(request: ExportUnitContentRequest, signal?: AbortSignal): Promise<UniverOperationResult> {
    const gateway = await this.requireGateway()
    return this.unitContent.export(gateway, request, signal)
  }

  createWorktree(file: UniverFilePath, name: string | undefined, signal?: AbortSignal): Promise<UniverOperationResult> {
    return this.createWorktreeInGateway(file, name, signal)
  }

  /** Stop Gateway ownership and clear transient state. */
  async dispose(): Promise<void> {
    this.stateCache.clear()
    this.unitCache.clear()
    await this.gatewaySupervisor.dispose()
  }

  /** Status value used by the Web Consumer. */
  async unitContentStatus(): Promise<'bundled'> {
    return 'bundled'
  }

  private async computeFileState(file: UniverFilePath): Promise<FileState> {
    let status = await this.gatewaySupervisor.status()
    if (status.gateway === null && this.config.autoStartGateway) {
      const started = await this.gatewaySupervisor.ensure()
      if (started.ok) status = { phase: 'running', gateway: started.gateway, owned: !started.reused }
    }
    if (status.gateway === null) throw new UniverError(status.reason ?? 'Univer Gateway is not available.', 'GATEWAY_UNAVAILABLE')
    const gateway = status.gateway
    const listing = await new GatewayFileApi(new GatewayClient(gateway, this.config.gatewayRequestTimeoutMs)).listWorktrees(file)
    const records = mapWorktrees(listing)
    const entries = await Promise.all(records.map(async (record): Promise<WorktreeState> => {
      const base = `${gateway}/?file=${encodeURIComponent(fileKeyOf(file))}`
      const worktree = encodeURIComponent(record.worktreeId)
      const openUrl = `${base}&worktree=${worktree}`
      const worktreeUrl = `${base}&worktree=${worktree}&mode=embedded&scope=worktree`
      const mergeUrl = `${base}&worktree=${worktree}&mode=embedded&scope=mergePreview`
      const changedUnits = record.status === 'draft' || record.status === 'ready'
        ? await this.unitCache.get(`${file}\u0000${record.worktreeId}`, () => this.worktrees.changedUnits(gateway, file, record.worktreeId))
        : []
      const units = changedUnits.map((unit) => ({
        ...unit,
        worktreeUrl: `${worktreeUrl}&unit=${encodeURIComponent(unit.unitId)}`,
        ...record.status === 'ready' ? { mergeUrl: `${mergeUrl}&unit=${encodeURIComponent(unit.unitId)}` } : {},
      }))
      return {
        worktreeId: record.worktreeId,
        name: record.name,
        status: record.status,
        units,
        ...record.status === 'draft' || record.status === 'ready'
          ? { openUrl, worktreeUrl }
          : {},
        ...record.status === 'ready'
          ? { mergeUrl }
          : {},
      }
    }))
    return {
      ok: true,
      file,
      gateway,
      gatewayRunning: true,
      viewerUrl: `${gateway}/?file=${encodeURIComponent(fileKeyOf(file))}`,
      worktrees: entries,
    }
  }

  private invalidate(file: UniverFilePath, worktreeId: string): void {
    this.stateCache.delete(file)
    this.unitCache.delete(`${file}\u0000${worktreeId}`)
  }

  private async createFileInGateway(request: CreateUniverFileRequest, signal?: AbortSignal): Promise<UniverOperationResult> {
    signal?.throwIfAborted()
    const available = await this.ensureGateway()
    if (!available.ok) throw new UniverError(available.reason, 'GATEWAY_UNAVAILABLE')
    const api = new GatewayFileApi(new GatewayClient(available.gateway, this.config.gatewayMutationTimeoutMs))
    await api.create(request.file)
    const result = await api.createUnit(request.file, request.kind, request.name)
    signal?.throwIfAborted()
    this.stateCache.delete(request.file)
    return { ok: true, operation: 'create', file: request.file, result }
  }

  private async createWorktreeInGateway(file: UniverFilePath, name: string | undefined, signal?: AbortSignal): Promise<UniverOperationResult> {
    signal?.throwIfAborted()
    const available = await this.ensureGateway()
    if (!available.ok) throw new UniverError(available.reason, 'GATEWAY_UNAVAILABLE')
    const result = await new GatewayWorktreeApi(new GatewayClient(available.gateway, this.config.gatewayMutationTimeoutMs)).create(file, name)
    signal?.throwIfAborted()
    this.stateCache.delete(file)
    return { ok: true, operation: 'worktree', file, result }
  }

  private async requireGateway(): Promise<string> {
    const available = await this.ensureGateway()
    if (!available.ok) throw new UniverError(available.reason, 'GATEWAY_UNAVAILABLE')
    return available.gateway
  }
}
