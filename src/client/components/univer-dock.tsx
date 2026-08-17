import * as React from 'react'
import type { Translate, SessionSnapshot } from '../dsh.ts'
import { targetsOfSession } from '../conversation/univer-target-definition.ts'
import { useUniverStates } from '../hooks/use-univer-state.ts'
import { ReviewPanel } from './review-panel.tsx'
import { WorktreeWindow } from './worktree-window.tsx'

/** Props supplied by the DSH conversation input dock. */
export interface UniverDockProps {
  readonly sessionId: string
  readonly session?: SessionSnapshot
  readonly t: Translate
  readonly useSessions?: (selector: (state: { readonly byId: Record<string, { readonly cwd?: string }> }) => string | undefined) => string | undefined
}

/** Project active worktrees into live windows or idle-session review panels. */
export function UniverDock(props: UniverDockProps): React.ReactElement {
  const cwd = props.useSessions?.((state) => state.byId[props.sessionId]?.cwd)
  const targets = React.useMemo(() => targetsOfSession(props.session ?? null, cwd), [props.session, cwd])
  const { states, applyState } = useUniverStates(targets.files, props.sessionId)
  const [dismissed, setDismissed] = React.useState<Record<string, string>>({})
  const windows: { readonly file: string; readonly worktree: import('../../shared/wire/state.ts').WorktreeState }[] = []
  const panels: typeof windows = []
  const running = props.session?.running === true

  for (const file of targets.files) {
    const state = states[file]
    if (state === undefined) continue
    for (const worktree of state.worktrees) {
      if (worktree.status !== 'draft' && worktree.status !== 'ready') continue
      if (targets.worktreeIds.size > 0 && !targets.worktreeIds.has(worktree.worktreeId)) continue
      if (running) {
        if (dismissed[worktree.worktreeId] !== worktree.status) windows.push({ file, worktree })
      } else {
        panels.push({ file, worktree })
      }
    }
  }

  return <>
    {windows.length === 0 ? null : <div className="uvf_root">{windows.map(({ file, worktree }) => <WorktreeWindow
      key={worktree.worktreeId}
      file={file}
      worktree={worktree}
      t={props.t}
      onDismiss={() => setDismissed((previous) => ({ ...previous, [worktree.worktreeId]: worktree.status }))}
    />)}</div>}
    {panels.map(({ file, worktree }) => <ReviewPanel key={`review:${worktree.worktreeId}`} sessionId={props.sessionId} file={file} worktree={worktree} t={props.t} applyState={applyState} />)}
  </>
}
