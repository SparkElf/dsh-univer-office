export interface LivePreviewWindowTarget {
  readonly file: string
  readonly worktreeId: string | null
  readonly preferredUnitId: string | null
}

export interface LivePreviewSessionState {
  open: Readonly<Record<string, LivePreviewWindowTarget>>
  readonly seenCallIds: Set<string>
  readonly dismissedFiles: Set<string>
}

const sessions = new Map<string, LivePreviewSessionState>()

/** Preserve floating-window intent while DSH remounts the input dock across Turns and sessions. */
export function livePreviewSessionState(sessionId: string): LivePreviewSessionState {
  const existing = sessions.get(sessionId)
  if (existing !== undefined) return existing
  const created: LivePreviewSessionState = {
    open: {},
    seenCallIds: new Set(),
    dismissedFiles: new Set()
  }
  sessions.set(sessionId, created)
  return created
}

export function updateLivePreviewWindows(
  state: LivePreviewSessionState,
  update: (
    previous: Readonly<Record<string, LivePreviewWindowTarget>>
  ) => Readonly<Record<string, LivePreviewWindowTarget>>
): Readonly<Record<string, LivePreviewWindowTarget>> {
  const proposed = update(state.open)
  if (state.dismissedFiles.size === 0) {
    state.open = proposed
    return proposed
  }
  let next = proposed
  for (const file of Object.keys(proposed)) {
    if (!state.dismissedFiles.has(file)) continue
    if (next === proposed) next = { ...proposed }
    delete (next as Record<string, LivePreviewWindowTarget>)[file]
  }
  state.open = next
  return next
}
