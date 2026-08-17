import type { Context } from '@deepseek-ai/cordis';
import type { ResolvedConfig } from '../config.ts';
import type { WorktreeActionResult } from '../../shared/wire/actions.ts';
import type { FileState } from '../../shared/wire/state.ts';
import type { EnsureGatewayResult, GatewayStatus } from '../../shared/wire/status.ts';
import type { CreateUniverFileRequest, ExecuteUnitContentRequest, ExportUnitContentRequest, FileStateRequest, InspectUnitContentRequest, UniverOperationResult, WorktreeActionRequest } from '../service/types.ts';
import type { UniverFilePath } from '../service/identifiers.ts';
import { UniverService } from '../service/univer-service.ts';
/** Local Service Provider backed by the bundled Gateway and Unit content worker. */
export declare class GatewayUniverService extends UniverService {
    private readonly config;
    private readonly gatewaySupervisor;
    private readonly unitContent;
    private readonly worktrees;
    private readonly stateCache;
    private readonly unitCache;
    constructor(ctx: Context, config: ResolvedConfig);
    /** Current Gateway status. */
    gatewayStatus(): Promise<GatewayStatus>;
    /** Ensure the bundled Gateway is available. */
    ensureGateway(): Promise<EnsureGatewayResult>;
    /** Return cached collaboration state for one file. */
    fileState(request: FileStateRequest): Promise<FileState>;
    /** Apply a human review decision and return the refreshed state. */
    worktreeAction(request: WorktreeActionRequest): Promise<WorktreeActionResult>;
    createFile(request: CreateUniverFileRequest, signal?: AbortSignal): Promise<UniverOperationResult>;
    inspectUnitContent(request: InspectUnitContentRequest, signal?: AbortSignal): Promise<UniverOperationResult>;
    executeUnitContent(request: ExecuteUnitContentRequest, signal?: AbortSignal): Promise<UniverOperationResult>;
    exportUnitContent(request: ExportUnitContentRequest, signal?: AbortSignal): Promise<UniverOperationResult>;
    createWorktree(file: UniverFilePath, name: string | undefined, signal?: AbortSignal): Promise<UniverOperationResult>;
    /** Stop Gateway ownership and clear transient state. */
    dispose(): Promise<void>;
    /** Status value used by the Web Consumer. */
    unitContentStatus(): Promise<'bundled'>;
    private computeFileState;
    private invalidate;
    private createFileInGateway;
    private createWorktreeInGateway;
    private requireGateway;
}
//# sourceMappingURL=gateway-univer-service.d.ts.map