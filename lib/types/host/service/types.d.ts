import type { WorktreeReviewAction, WorktreeActionResult } from '../../shared/wire/actions.ts';
import type { FileState } from '../../shared/wire/state.ts';
import type { EnsureGatewayResult, GatewayStatus } from '../../shared/wire/status.ts';
import type { UniverFilePath, WorktreeId } from './identifiers.ts';
/** JSON values accepted across the model tool boundary. */
export type JsonValue = null | boolean | number | string | JsonValue[] | {
    [key: string]: JsonValue;
};
/** Request for one file's collaboration state. */
export interface FileStateRequest {
    readonly file: UniverFilePath;
}
/** Request for a human worktree lifecycle decision. */
export interface WorktreeActionRequest {
    readonly action: WorktreeReviewAction;
    readonly file: UniverFilePath;
    readonly worktreeId: WorktreeId;
}
/** Unit kinds supported by the collaboration Gateway. */
export type UniverUnitKind = 'sheet' | 'doc' | 'slide' | 'base' | 'board';
/** Request for creating a Univer file with its first Unit. */
export interface CreateUniverFileRequest {
    readonly file: UniverFilePath;
    readonly kind: UniverUnitKind;
    readonly name: string;
}
/** Request for inspecting a Univer file or one unit. */
export interface InspectUnitContentRequest {
    readonly file: UniverFilePath;
    readonly unitId?: string;
    readonly range?: string;
    readonly worktreeId?: WorktreeId;
}
/** Request for executing Univer Facade code. */
export interface ExecuteUnitContentRequest {
    readonly file: UniverFilePath;
    readonly code: string;
    readonly worktreeId: WorktreeId;
    readonly unitId: string;
}
/** Request for exporting a Univer file. */
export interface ExportUnitContentRequest {
    readonly file: UniverFilePath;
    readonly output: string;
    readonly unitId?: string;
    readonly worktreeId?: WorktreeId;
}
/** Structured content-operation result logged in the DSH session. */
export interface UniverOperationResult {
    readonly ok: true;
    readonly operation: 'create' | 'inspect' | 'execute' | 'export' | 'worktree';
    readonly file: string;
    readonly result: JsonValue;
}
/** Stable methods offered by the Univer service. */
export interface UniverServiceMethods {
    gatewayStatus(): Promise<GatewayStatus>;
    ensureGateway(): Promise<EnsureGatewayResult>;
    unitContentStatus(): Promise<'bundled' | 'unavailable'>;
    fileState(request: FileStateRequest): Promise<FileState>;
    worktreeAction(request: WorktreeActionRequest): Promise<WorktreeActionResult>;
    createFile(request: CreateUniverFileRequest, signal?: AbortSignal): Promise<UniverOperationResult>;
    inspectUnitContent(request: InspectUnitContentRequest, signal?: AbortSignal): Promise<UniverOperationResult>;
    executeUnitContent(request: ExecuteUnitContentRequest, signal?: AbortSignal): Promise<UniverOperationResult>;
    exportUnitContent(request: ExportUnitContentRequest, signal?: AbortSignal): Promise<UniverOperationResult>;
    createWorktree(file: UniverFilePath, name: string | undefined, signal?: AbortSignal): Promise<UniverOperationResult>;
}
//# sourceMappingURL=types.d.ts.map