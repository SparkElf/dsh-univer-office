import type {
  ConversationNodeDefinition, ConversationSnapshot,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'

/** One preview target recovered from durable conversation events. */
export interface UniverTarget {
  readonly file: string
  readonly worktreeId: string | null
}

/** Turn data published by the Univer conversation definition. */
export interface UniverTurnData {
  readonly targets: readonly UniverTarget[]
}

/** Match passed from the turn-tail selector to the preview component. */
export interface UniverPreviewMatch extends UniverTurnData {
  readonly turn: number
}

interface UniverTargetState extends UniverTurnData {
  readonly turn: number
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  interface ConversationTurnDataMap {
    /** Univer files and worktrees mentioned during this Turn. */
    univerTarget: UniverTurnData
  }
}

/** Conversation definition that projects tool calls/results into preview targets. */
export const univerTargetDefinition = {
  kind: 'univerTarget',
  match(event: SessionEvent) {
    if (event.type === 'turn/start') return { id: String(event.data.turn), role: 'start' }
    if (event.type === 'tool/call' || event.type === 'tool/result') return { id: String(event.data.turn), role: 'update' }
    return null
  },
  start(_context, match): UniverTargetState {
    if (match.event.type !== 'turn/start') throw new Error('univerTarget start match must be turn/start')
    return { turn: match.event.data.turn, targets: [] }
  },
  update(context, match): UniverTargetState {
    const additions = targetsFromEvent(match.event)
    return additions.length === 0 ? context.state : { ...context.state, targets: mergeTargets(context.state.targets, additions) }
  },
  buildLocationData(context, scope) {
    if (scope !== 'turn' || context.state === undefined) return null
    return { kind: 'turn', turn: context.state.turn, key: 'univerTarget', value: { targets: context.state.targets } }
  },
} satisfies ConversationNodeDefinition<UniverTargetState>

/** Select a turn-tail preview only for turns containing Univer targets. */
export function selectUniverPreview(owner: TurnTailOwnerProps): UniverPreviewMatch | null {
  const data = owner.turn.data.get('univerTarget')
  if (data === undefined || data.targets.length === 0) return null
  return { turn: owner.turn.turn, targets: data.targets }
}

/** Resolve and deduplicate the files rendered as turn-tail preview cards. */
export function previewTargets(targets: readonly UniverTarget[], cwd?: string): UniverTarget[] {
  const unique = new Map<string, UniverTarget>()
  for (const target of targets) {
    const file = resolveTargetFile(target.file, cwd)
    const previous = unique.get(file)
    unique.set(file, {
      file,
      worktreeId: target.worktreeId ?? previous?.worktreeId ?? null,
    })
  }
  return [...unique.values()]
}

/** Recover all unique target files and mentioned worktrees from a session. */
export function targetsOfSession(session: ConversationSnapshot, cwd?: string): { readonly files: string[]; readonly worktreeIds: Set<string> } {
  const files: string[] = []
  const worktreeIds = new Set<string>()
  const turns = session.chat.timeline.turns
  for (const turn of turns.values()) {
    const data = turn.data.get('univerTarget')
    if (data === undefined) continue
    for (const target of data.targets) {
      const file = resolveTargetFile(target.file, cwd)
      if (!files.includes(file)) files.push(file)
      if (target.worktreeId !== null) worktreeIds.add(target.worktreeId)
    }
  }
  return { files, worktreeIds }
}

function targetsFromEvent(event: SessionEvent): UniverTarget[] {
  if (event.type === 'tool/call') return targetsFromCall(event.data)
  if (event.type === 'tool/result') return targetsFromResult(event.data)
  return []
}

function targetsFromCall(data: SessionEvent<'tool/call'>['data']): UniverTarget[] {
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

function targetsFromResult(data: SessionEvent<'tool/result'>['data']): UniverTarget[] {
  const content = data.message.content[0].content
  const text = content.flatMap((block) => block.type === 'text' ? [block.text] : []).join('\n')
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
    else merged[index] = {
      file: target.file,
      worktreeId: target.worktreeId ?? merged[index]?.worktreeId ?? null,
    }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
