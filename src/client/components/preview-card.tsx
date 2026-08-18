import * as React from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { getFileState } from '../api/univer-api.ts'
import type { UniverPreviewMatch, UniverTarget } from '../conversation/univer-target-definition.ts'
import { basename, previewTargets } from '../conversation/univer-target-definition.ts'
import { useGatewayStatus } from '../hooks/use-univer-state.ts'
import { localizeViewerUrl } from '../viewer-locale.ts'
import type { ViewerLocaleInjected } from '../viewer-locale.ts'
import { GridIcon, PreviewDialog } from './preview-dialog.tsx'

/** Props composed by the DSH turn-tail slot. */
export type PreviewCardProps = PropsRuntime<'conversation.chat.turnTail'> & PropsLocale<'univer'> & ViewerLocaleInjected & { readonly matched: UniverPreviewMatch }

/** Render one turn-tail preview card for each file touched by Univer tools. */
export function PreviewCard(props: PreviewCardProps): React.ReactElement {
  const cwd = props.useSessions((state) => state.byId[props.sessionId]?.cwd)
  const targets = React.useMemo(() => previewTargets(props.matched.targets, cwd), [props.matched.targets, cwd])
  return <>{targets.map((target) => <FilePreviewCard
    key={target.file}
    target={target}
    sessionId={props.sessionId}
    t={props.t}
    getViewerLocale={props.getViewerLocale}
  />)}</>
}

type FilePreviewCardProps = Pick<PreviewCardProps, 'sessionId' | 't' | 'getViewerLocale'> & {
  readonly target: UniverTarget
}

/** Preview one Univer file without aggregating unrelated files into the card. */
function FilePreviewCard(props: FilePreviewCardProps): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [preview, setPreview] = React.useState<{ readonly url: string | null; readonly worktreeName: string | null }>({ url: null, worktreeName: null })
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
      })
    }).catch(() => {
      if (mounted) setPreview({ url: null, worktreeName: null })
    })
    return () => { mounted = false }
  }, [target.file, target.worktreeId, props.sessionId, gateway.phase])

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
