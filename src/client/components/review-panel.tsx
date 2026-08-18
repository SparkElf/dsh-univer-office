import * as React from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { FileState, WorktreeState } from '../../shared/wire/state.ts'
import { basename } from '../conversation/univer-target-definition.ts'
import { useWorktreeAction } from '../hooks/use-worktree-action.ts'
import { localizeViewerUrl } from '../viewer-locale.ts'
import type { ViewerLocale } from '../viewer-locale.ts'
import { UnitChips, unitViewerUrl } from './unit-chips.tsx'

/** Persistent Turn-tail card with a full Univer page below its review header. */
export function ReviewPanel(props: { readonly sessionId: SessionId; readonly file: string; readonly trunkUrl: string | null; readonly worktree: WorktreeState; readonly t: TranslateNS<'univer'>; readonly viewerLocale: ViewerLocale; readonly applyState: (state: FileState) => void }): React.ReactElement {
  const [open, setOpen] = React.useState(true)
  const [fullscreen, setFullscreen] = React.useState(false)
  const [selected, setSelected] = React.useState<string | undefined>()
  const action = useWorktreeAction(props.file, props.worktree.worktreeId, props.sessionId)
  const ready = props.worktree.status === 'ready'
  const merged = props.worktree.status === 'merged'
  const discarded = props.worktree.status === 'discarded'
  const terminal = merged || discarded
  const statusKey = merged ? 'dock.merged' : discarded ? 'dock.discarded' : ready ? 'dock.mergeReady' : 'dock.draft'
  const selectedUnit = selected !== undefined && props.worktree.units.some((unit) => unit.unitId === selected) ? selected : props.worktree.units[0]?.unitId
  const scopedTarget = terminal
    ? withUnit(props.trunkUrl ?? undefined, selectedUnit)
    : unitViewerUrl(ready ? props.worktree.mergeUrl : props.worktree.worktreeUrl, props.worktree.units, selectedUnit, ready ? 'merge' : 'worktree')
  const target = reviewPageUrl(scopedTarget ?? (!ready && !terminal ? props.worktree.openUrl : undefined))
  const url = target === undefined ? undefined : localizeViewerUrl(target, props.viewerLocale)

  React.useEffect(() => {
    if (!fullscreen) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreen])

  const run = async (name: 'ready' | 'discard'): Promise<void> => {
    const result = await action.perform(name)
    if (result?.ok) props.applyState(result.state)
  }
  return <section className={`uvf_panel${fullscreen ? ' uvf_panel_fullscreen' : ''}`} data-status={props.worktree.status} aria-label={basename(props.file)}>
    <header className="uvf_panelHead">
      <span className="uvf_panelGlyph" aria-hidden="true"><UniverMark merged={merged} discarded={discarded} /></span>
      <span className="uvf_panelIdentity">
        <span className="uvf_panelTitleRow"><span className="uvf_panelTitle">{basename(props.file)}</span><span className="uvf_panelWorktree">{props.worktree.name || props.worktree.worktreeId}</span></span>
        <span className="uvf_panelMeta" title={props.file}>{props.file}</span>
      </span>
      <span className="uvf_panelChip" data-status={props.worktree.status}><span className="uvf_panelStatusDot" aria-hidden="true" />{props.t(statusKey)}</span>
      <PanelControl action="fullscreen" label={props.t(fullscreen ? 'dock.exitFullscreen' : 'dock.fullscreen')} onClick={() => {
        setOpen(true)
        setFullscreen((value) => !value)
      }}>
        <FullscreenIcon restored={fullscreen} />
      </PanelControl>
      {fullscreen ? null : <PanelControl action="fold" label={props.t(open ? 'dock.fold' : 'dock.expand')} onClick={() => setOpen((value) => !value)}>
        <FoldIcon open={open} />
      </PanelControl>}
    </header>
    <div className="uvf_panelContent" hidden={!open}>
      <div className="uvf_panelBody">
        <UnitChips units={props.worktree.units} selected={selectedUnit} t={props.t} onSelect={setSelected} />
        {url === undefined ? <div className="uvf_panelUnavailable">{props.t('dock.gatewayDown')}</div> : <iframe className="uvf_panelFrame" src={url} title={props.worktree.name || props.worktree.worktreeId} />}
      </div>
      {!terminal && !ready ? <footer className="uvf_panelFoot">
        <span className={action.error === null ? 'uvf_hint' : 'uvf_error'}>{action.error ?? (ready ? '' : props.t('dock.notReady'))}</span>
        <button type="button" className="uvf_action" data-kind="discard" disabled={action.busy !== null} onClick={() => void run('discard')}>{props.t('dock.discard')}</button>
        <button type="button" className="uvf_action" data-kind="ready" disabled={action.busy !== null} onClick={() => void run('ready')}>{props.t('dock.markReady')}</button>
      </footer> : null}
    </div>
  </section>
}

function withUnit(url: string | undefined, unitId: string | undefined): string | undefined {
  if (url === undefined || unitId === undefined) return url
  const target = new URL(url)
  target.searchParams.set('unit', unitId)
  return target.toString()
}

function reviewPageUrl(url: string | undefined): string | undefined {
  if (url === undefined) return undefined
  const target = new URL(url)
  target.searchParams.delete('mode')
  target.searchParams.set('sidebar', 'collapsed')
  return target.toString()
}

function PanelControl(props: { readonly action: string; readonly label: string; readonly onClick: () => void; readonly children: React.ReactNode }): React.ReactElement {
  return <button type="button" className="uvf_btn" data-panel-action={props.action} title={props.label} aria-label={props.label} onClick={props.onClick}>{props.children}</button>
}

function FoldIcon(props: { readonly open: boolean }): React.ReactElement {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d={props.open ? 'm4 10 4-4 4 4' : 'm4 6 4 4 4-4'} /></svg>
}

function UniverMark(props: { readonly merged: boolean; readonly discarded: boolean }): React.ReactElement {
  if (props.merged) return <svg viewBox="0 0 20 20"><path d="m5 10 3 3 7-7" /></svg>
  if (props.discarded) return <svg viewBox="0 0 20 20"><path d="M6 10h8" /></svg>
  return <svg viewBox="0 0 20 20"><rect x="4" y="4" width="12" height="12" rx="2" /><path d="M4 8h12M8 4v12" /></svg>
}

function FullscreenIcon(props: { readonly restored: boolean }): React.ReactElement {
  return <svg viewBox="0 0 16 16" aria-hidden="true">{props.restored
    ? <path d="M6 3v3H3m10 0h-3V3m0 10v-3h3M3 10h3v3" />
    : <path d="M6 3H3v3m10 0V3h-3m0 10h3v-3M3 10v3h3" />}</svg>
}
