import type { WorktreeReviewAction } from '../../../shared/wire/actions.ts'
import type { JsonValue } from '../../service/types.ts'
import { GatewayClient } from './client.ts'
import { fileKeyOf } from './file-api.ts'

/** Gateway worktree API used by the Provider. */
export class GatewayWorktreeApi {
  constructor(private readonly client: GatewayClient) {}

  /** Return merge-preview metadata for one worktree. */
  preview(file: string, worktreeId: string): Promise<JsonValue> {
    return this.client.get(`/uf/${fileKeyOf(file)}/worktrees/${encodeURIComponent(worktreeId)}/preview`)
  }

  /** Create an isolated worktree for agent edits. */
  create(file: string, name: string | undefined): Promise<JsonValue> {
    return this.client.post(`/uf/${fileKeyOf(file)}/worktrees`, {
      agentId: 'dsh-agent',
      name: name ?? 'DSH agent worktree',
    })
  }

  /** Return Units visible inside one worktree. */
  listUnits(file: string, worktreeId: string): Promise<JsonValue> {
    return this.client.get(`/uf/${fileKeyOf(file)}/worktrees/${encodeURIComponent(worktreeId)}/units`)
  }

  /** Apply one human review decision. */
  action(file: string, worktreeId: string, action: WorktreeReviewAction): Promise<JsonValue> {
    return this.client.post(`/uf/${fileKeyOf(file)}/worktrees/${encodeURIComponent(worktreeId)}/${action}`)
  }
}
