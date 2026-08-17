import * as React from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ActiveWorktreeState, FileState } from '../../shared/wire/state.ts'
import { basename } from '../conversation/univer-target-definition.ts'
import { useWorktreeAction } from '../hooks/use-worktree-action.ts'
import { localizeViewerUrl } from '../viewer-locale.ts'
import type { ViewerLocale } from '../viewer-locale.ts'
import { UnitChips, unitViewerUrl } from './unit-chips.tsx'

/** Session-end review panel for a draft or ready worktree. */
export function ReviewPanel(props: { readonly sessionId: SessionId; readonly file: string; readonly worktree: ActiveWorktreeState; readonly t: TranslateNS<'univer'>; readonly viewerLocale: ViewerLocale; readonly applyState: (state: FileState) => void }): React.ReactElement {
  const [open, setOpen] = React.useState(true)
  const [selected, setSelected] = React.useState<string | undefined>()
  const action = useWorktreeAction(props.file, props.worktree.worktreeId, props.sessionId)
  const ready = props.worktree.status === 'ready'
  const selectedUnit = selected !== undefined && props.worktree.units.some((unit) => unit.unitId === selected) ? selected : props.worktree.units[0]?.unitId
  const target = unitViewerUrl(ready ? props.worktree.mergeUrl : props.worktree.worktreeUrl, props.worktree.units, selectedUnit, ready ? 'merge' : 'worktree')
  const url = target === undefined ? undefined : localizeViewerUrl(target, props.viewerLocale)
  const run = async (name: 'ready' | 'discard' | 'merge'): Promise<void> => {
    const result = await action.perform(name)
    if (result?.ok) props.applyState(result.state)
  }
  return <div className="uvf_panel">
    <div className="uvf_panelHead" onClick={() => setOpen((value) => !value)}>
      <span className="uvf_panelTitle">🧾 {props.t(ready ? 'dock.mergeTitle' : 'dock.reviewTitle')}「{props.worktree.name || props.worktree.worktreeId}」<span className="uvf_file"> · {basename(props.file)}</span></span>
      <span className="uvf_panelChip" data-status={props.worktree.status}>{props.t(ready ? 'dock.mergeReady' : 'dock.draft')}</span>
      <button type="button" className="uvf_btn">{open ? '▾' : '▴'}</button>
    </div>
    {open ? <>
      <UnitChips units={props.worktree.units} selected={selectedUnit} t={props.t} onSelect={setSelected} />
      {url === undefined ? null : <iframe className="uvf_panelFrame" src={url} title={props.worktree.name || props.worktree.worktreeId} />}
      <div className="uvf_panelFoot">
        <span className={action.error === null ? 'uvf_hint' : 'uvf_error'}>{action.error ?? (ready ? '' : props.t('dock.notReady'))}</span>
        <button type="button" className="uvf_action" data-kind="discard" disabled={action.busy !== null} onClick={() => void run('discard')}>{props.t('dock.discard')}</button>
        <button type="button" className="uvf_action" data-kind={ready ? 'merge' : 'ready'} disabled={action.busy !== null} onClick={() => void run(ready ? 'merge' : 'ready')}>{props.t(ready ? 'dock.merge' : 'dock.markReady')}</button>
      </div>
    </> : null}
  </div>
}
