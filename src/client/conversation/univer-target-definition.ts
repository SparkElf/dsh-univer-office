import type { SessionSnapshot } from '../dsh.ts'

/** One preview target recovered from durable conversation events. */
export interface UniverTarget {
  readonly file: string
  readonly worktreeId: string | null
}

/** Turn-local state stored by the DSH conversation event engine. */
export interface UniverTurnData {
  readonly turn: unknown
  readonly targets: readonly UniverTarget[]
}

interface EventEnvelope { readonly type: string; readonly data: Record<string, unknown> }
interface DefinitionContext { readonly state: UniverTurnData }
interface DefinitionMatch { readonly event: EventEnvelope }

/** Conversation definition that projects tool calls/results into preview targets. */
export const univerTargetDefinition = {
  kind: 'univerTarget',
  match(event: EventEnvelope) {
    if (event.type === 'turn/start') return { id: String(event.data.turn), role: 'start' }
    if (event.type === 'tool/call' || event.type === 'tool/result') return { id: String(event.data.turn), role: 'update' }
    return null
  },
  start(_context: unknown, match: DefinitionMatch): UniverTurnData {
    return { turn: match.event.data.turn, targets: [] }
  },
  update(context: DefinitionContext, match: DefinitionMatch): UniverTurnData {
    const additions = targetsFromEvent(match.event)
    return additions.length === 0 ? context.state : { ...context.state, targets: mergeTargets(context.state.targets, additions) }
  },
  buildLocationData(context: { readonly state?: UniverTurnData }, scope: string) {
    if (scope !== 'turn' || context.state === undefined) return null
    return { kind: 'turn', turn: context.state.turn, key: 'univerTarget', value: { targets: context.state.targets } }
  },
}

/** Select a turn-tail preview only for turns containing Univer targets. */
export function selectUniverPreview(owner: { readonly turn: { readonly data: Map<string, unknown> } }) {
  const data = owner.turn.data.get('univerTarget')
  if (!isTurnData(data) || data.targets.length === 0) return null
  return { targets: data.targets }
}

/** Recover all unique target files and mentioned worktrees from a session. */
export function targetsOfSession(session: SessionSnapshot | null, cwd?: string): { readonly files: string[]; readonly worktreeIds: Set<string> } {
  const files: string[] = []
  const worktreeIds = new Set<string>()
  const turns = session?.chat?.timeline?.turns
  if (turns === undefined) return { files, worktreeIds }
  for (const turn of turns.values()) {
    const data = turn.data?.get('univerTarget')
    if (!isTurnData(data)) continue
    for (const target of data.targets) {
      const file = resolveTargetFile(target.file, cwd)
      if (!files.includes(file)) files.push(file)
      if (target.worktreeId !== null) worktreeIds.add(target.worktreeId)
    }
  }
  return { files, worktreeIds }
}

function targetsFromEvent(event: EventEnvelope): UniverTarget[] {
  if (event.type === 'tool/call') return targetsFromCall(event.data)
  if (event.type === 'tool/result') return targetsFromResult(event.data)
  return []
}

function targetsFromCall(data: Record<string, unknown>): UniverTarget[] {
  if (typeof data.name !== 'string' || typeof data.arguments !== 'string') return []
  let args: Record<string, unknown>
  try {
    const parsed = JSON.parse(data.arguments) as unknown
    if (!isRecord(parsed)) return []
    args = parsed
  } catch (error) {
    return []
  }
  if (data.name.startsWith('univer_') && typeof args.file === 'string') {
    return [{ file: args.file, worktreeId: typeof args.worktreeId === 'string' ? args.worktreeId : null }]
  }
  return []
}

function targetsFromResult(data: Record<string, unknown>): UniverTarget[] {
  const message = isRecord(data.message) ? data.message : null
  const content = message !== null && Array.isArray(message.content) ? message.content : []
  const text = content.flatMap((block) => isRecord(block) && typeof block.text === 'string' ? [block.text] : []).join('\n')
  if (text.length === 0) return []
  const structured = parseStructuredResult(text)
  if (structured !== null && typeof structured.file === 'string') {
    const result = isRecord(structured.result) ? structured.result : null
    const worktree = result !== null && typeof result.worktreeId === 'string' ? result.worktreeId : null
    return [{ file: structured.file, worktreeId: worktree }]
  }
  return []
}

function parseStructuredResult(text: string): Record<string, unknown> | null {
  const firstBrace = text.indexOf('{')
  if (firstBrace === -1) return null
  try {
    const value = JSON.parse(text.slice(firstBrace)) as unknown
    return isRecord(value) ? value : null
  } catch (error) {
    return null
  }
}

function mergeTargets(previous: readonly UniverTarget[], additions: readonly UniverTarget[]): UniverTarget[] {
  const merged = [...previous]
  for (const target of additions) {
    const index = merged.findIndex((entry) => entry.file === target.file)
    if (index === -1) merged.push(target)
    else merged[index] = target
  }
  return merged
}

function resolveTargetFile(file: string, cwd?: string): string {
  if (isAbsolute(file) || cwd === undefined || cwd === '') return file
  return `${cwd.replace(/\/+$/, '')}/${file.replace(/^\.\//, '')}`
}

function isAbsolute(file: string): boolean {
  return file.startsWith('/') || /^[A-Za-z]:[\\/]/.test(file)
}

export function basename(file: string): string {
  const at = Math.max(file.lastIndexOf('/'), file.lastIndexOf('\\'))
  return at === -1 ? file : file.slice(at + 1)
}

function isTurnData(value: unknown): value is UniverTurnData {
  return isRecord(value) && Array.isArray(value.targets)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
