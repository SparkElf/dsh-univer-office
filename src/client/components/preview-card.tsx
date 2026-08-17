import * as React from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { getFileState } from '../api/univer-api.ts'
import type { UniverPreviewMatch } from '../conversation/univer-target-definition.ts'
import { basename } from '../conversation/univer-target-definition.ts'
import { useGatewayStatus } from '../hooks/use-univer-state.ts'
import { localizeViewerUrl } from '../viewer-locale.ts'
import type { ViewerLocaleInjected } from '../viewer-locale.ts'
import { GridIcon, PreviewDialog } from './preview-dialog.tsx'

/** Props composed by the DSH turn-tail slot. */
export type PreviewCardProps = PropsRuntime<'conversation.chat.turnTail'> & PropsLocale<'univer'> & ViewerLocaleInjected & { readonly matched: UniverPreviewMatch }

/** Turn-tail preview card for files touched by Univer tools. */
export function PreviewCard(props: PreviewCardProps): React.ReactElement {
  const targets = props.matched.targets
  const [selected, setSelected] = React.useState(0)
  const [open, setOpen] = React.useState(false)
  const [url, setUrl] = React.useState<string | null>(null)
  const gateway = useGatewayStatus()
  const active = targets[Math.min(selected, Math.max(0, targets.length - 1))]

  React.useEffect(() => {
    if (active === undefined) return
    let mounted = true
    void getFileState(active.file, props.sessionId).then((state) => {
      if (!mounted) return
      const openUrl = active.worktreeId === null ? null : state.worktrees.find((entry) => entry.worktreeId === active.worktreeId)?.openUrl
      setUrl(openUrl ?? state.viewerUrl)
    }).catch(() => {
      if (mounted) setUrl(null)
    })
    return () => { mounted = false }
  }, [active?.file, active?.worktreeId, props.sessionId, gateway.phase])

  if (active === undefined) return <></>
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
        <span className="unvT_title"><GridIcon size={16} /><span className="unvT_file">{basename(active.file)}</span>{active.worktreeId === null ? null : <span className="unvT_wt">{active.worktreeId}</span>}</span>
        {targets.length <= 1 ? null : targets.map((target, index) => <button
          key={`${target.file}:${String(target.worktreeId)}`}
          type="button"
          className="unvT_chip"
          data-active={index === selected || undefined}
          onClick={(event) => { event.stopPropagation(); setSelected(index) }}
        >{basename(target.file)}</button>)}
        <span className="unvT_actions"><button type="button" className="unvT_expandBtn" onClick={(event) => { event.stopPropagation(); toggle() }}>{props.t(open ? 'collapse' : 'expand')} {open ? '▴' : '▾'}</button></span>
      </div>
      <div className="unvT_path">{active.file}</div>
    </div>
    {open && url !== null ? <PreviewDialog file={active.file} worktreeId={active.worktreeId} url={localizeViewerUrl(url, props.getViewerLocale())} t={props.t} onClose={() => setOpen(false)} /> : null}
  </div>
}
