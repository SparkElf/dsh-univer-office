import * as React from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { WorktreeState, WorktreeStatus } from '../../shared/wire/state.ts'
import { getFileState } from '../api/univer-api.ts'
import type { UniverPreviewMatch, UniverTarget } from '../conversation/univer-target-definition.ts'
import { basename, previewTargets } from '../conversation/univer-target-definition.ts'
import { useGatewayStatus, useUniverStates } from '../hooks/use-univer-state.ts'
import { localizeViewerUrl } from '../viewer-locale.ts'
import type { ViewerLocaleInjected } from '../viewer-locale.ts'
import { GridIcon, PreviewDialog } from './preview-dialog.tsx'
import { ReviewPanel } from './review-panel.tsx'

/** Props composed by the DSH turn-tail slot. */
export type PreviewCardProps = PropsRuntime<'conversation.chat.turnTail'> & PropsLocale<'univer'> & ViewerLocaleInjected & { readonly matched: UniverPreviewMatch }

/** Render Univer file previews and completed-Turn worktree reviews. */
export function PreviewCard(props: PreviewCardProps): React.ReactElement {
  const session = props.useSession((snapshot) => snapshot)
  const cwd = props.useSessions((state) => state.byId[props.sessionId]?.cwd)
  const targets = React.useMemo(() => previewTargets(props.matched.targets, cwd), [props.matched.targets, cwd])
  const latestWorktreeTurns = React.useMemo(() => {
    const latest = new Map<string, number>()
    for (const [turnNumber, turn] of session.chat.timeline.turns) {
      const data = turn.data.get('univerTarget')
      if (data === undefined) continue
      for (const target of data.targets) {
        if (target.worktreeId !== null) latest.set(target.worktreeId, turnNumber)
      }
    }
    return latest
  }, [session])
  const reviewTargets = targets.filter((target) => target.worktreeId !== null && latestWorktreeTurns.get(target.worktreeId) === props.matched.turn)
  const reviewFiles = session.running === true ? [] : [...new Set(reviewTargets.map((target) => target.file))]
  const { states, applyState } = useUniverStates(reviewFiles, props.sessionId)
  const panels: { readonly file: string; readonly trunkUrl: string | null; readonly worktree: WorktreeState }[] = []
  for (const target of reviewTargets) {
    if (target.worktreeId === null) continue
    const state = states[target.file]
    const worktree = state?.worktrees.find((entry) => entry.worktreeId === target.worktreeId)
    if (worktree !== undefined) panels.push({ file: target.file, trunkUrl: state?.viewerUrl ?? null, worktree })
  }
  const panelIds = new Set(panels.map(({ worktree }) => worktree.worktreeId))

  return <>
    {targets.filter((target) => target.worktreeId === null || !panelIds.has(target.worktreeId)).map((target) => <FilePreviewCard
      key={target.file}
      target={target}
      historical={target.worktreeId !== null && latestWorktreeTurns.get(target.worktreeId) !== props.matched.turn}
      sessionId={props.sessionId}
      t={props.t}
      getViewerLocale={props.getViewerLocale}
    />)}
    {panels.map(({ file, trunkUrl, worktree }) => <ReviewPanel
      key={`review:${worktree.worktreeId}`}
      sessionId={props.sessionId}
      file={file}
      trunkUrl={trunkUrl}
      worktree={worktree}
      t={props.t}
      viewerLocale={props.getViewerLocale()}
      applyState={applyState}
    />)}
  </>
}

type FilePreviewCardProps = Pick<PreviewCardProps, 'sessionId' | 't' | 'getViewerLocale'> & {
  readonly target: UniverTarget
  readonly historical: boolean
}

/** Preview one Univer file without aggregating unrelated files into the card. */
function FilePreviewCard(props: FilePreviewCardProps): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [preview, setPreview] = React.useState<{ readonly url: string | null; readonly worktreeName: string | null; readonly status: WorktreeStatus | null }>({ url: null, worktreeName: null, status: null })
  const gateway = useGatewayStatus()
  const target = props.target

  React.useEffect(() => {
    let mounted = true
    void getFileState(target.file, props.sessionId).then((state) => {
      if (!mounted) return
      const worktree = target.worktreeId === null ? undefined : state.worktrees.find((entry) => entry.worktreeId === target.worktreeId)
      setPreview({
        url: worktree?.openUrl ?? state.viewerUrl,
        worktreeName: worktree?.name ?? null,
        status: worktree?.status ?? null,
      })
    }).catch(() => {
      if (mounted) setPreview({ url: null, worktreeName: null, status: null })
    })
    return () => { mounted = false }
  }, [target.file, target.worktreeId, props.sessionId, gateway.phase])

  if (props.historical && target.worktreeId !== null) return <HistoricalReviewHeader
    file={target.file}
    worktreeId={target.worktreeId}
    worktreeName={preview.worktreeName}
    status={preview.status}
    t={props.t}
  />

  const toggle = (): void => setOpen((value) => !value)
  return <div className="unvT_card">
    <div className="unvT_head" onClick={toggle}>
      <div className="unvT_titleRow">
        <span
          className="unvT_dot"
          data-gateway={gateway.phase}
          title={props.t(`gateway.${gateway.phase}`)}
          onClick={gateway.phase === 'stopped' || gateway.phase === 'failed' ? (event) => { event.stopPropagation(); void gateway.start() } : undefined}
        />
        <span className="unvT_title"><GridIcon size={16} /><span className="unvT_file">{basename(target.file)}</span>{preview.worktreeName === null ? null : <span className="unvT_wt">{preview.worktreeName}</span>}</span>
        <span className="unvT_actions"><button type="button" className="unvT_expandBtn" onClick={(event) => { event.stopPropagation(); toggle() }}>{props.t(open ? 'collapse' : 'expand')} {open ? '▴' : '▾'}</button></span>
      </div>
      <div className="unvT_path">{target.file}</div>
    </div>
    {open && preview.url !== null ? <PreviewDialog file={target.file} worktreeId={target.worktreeId} url={localizeViewerUrl(preview.url, props.getViewerLocale())} t={props.t} onClose={() => setOpen(false)} /> : null}
  </div>
}

function HistoricalReviewHeader(props: { readonly file: string; readonly worktreeId: string; readonly worktreeName: string | null; readonly status: WorktreeStatus | null; readonly t: PreviewCardProps['t'] }): React.ReactElement {
  const merged = props.status === 'merged'
  const discarded = props.status === 'discarded'
  const statusKey = merged ? 'dock.merged' : discarded ? 'dock.discarded' : props.status === 'ready' ? 'dock.mergeReady' : 'dock.draft'
  return <section className="uvf_panel uvf_panel_history" data-status={props.status ?? 'history'} aria-label={basename(props.file)}>
    <header className="uvf_panelHead">
      <span className="uvf_panelGlyph" aria-hidden="true"><HistoryMark merged={merged} discarded={discarded} /></span>
      <span className="uvf_panelIdentity">
        <span className="uvf_panelTitleRow"><span className="uvf_panelTitle">{basename(props.file)}</span><span className="uvf_panelWorktree">{props.worktreeName ?? props.worktreeId}</span></span>
        <span className="uvf_panelMeta" title={props.file}>{props.file}</span>
      </span>
      {props.status === null ? null : <span className="uvf_panelChip" data-status={props.status}><span className="uvf_panelStatusDot" aria-hidden="true" />{props.t(statusKey)}</span>}
    </header>
  </section>
}

function HistoryMark(props: { readonly merged: boolean; readonly discarded: boolean }): React.ReactElement {
  if (props.merged) return <svg viewBox="0 0 20 20"><path d="m5 10 3 3 7-7" /></svg>
  if (props.discarded) return <svg viewBox="0 0 20 20"><path d="M6 10h8" /></svg>
  return <svg viewBox="0 0 20 20"><rect x="4" y="4" width="12" height="12" rx="2" /><path d="M4 8h12M8 4v12" /></svg>
}
