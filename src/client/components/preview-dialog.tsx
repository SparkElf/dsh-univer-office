import * as React from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { basename } from '../conversation/univer-target-definition.ts'

/** Fullscreen in-app Viewer dialog. */
export function PreviewDialog(props: { readonly file: string; readonly worktreeId: string | null; readonly url: string; readonly t: TranslateNS<'univer'>; readonly onClose: () => void }): React.ReactElement {
  const [frameKey, setFrameKey] = React.useState(0)
  const closeRef = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [props.onClose])
  return <div className="unvT_overlay">
    <div className="unvT_mask" onClick={props.onClose} />
    <div className="unvT_panel">
      <div className="unvT_panelHead">
        <span className="unvT_panelTitle">
          <GridIcon size={16} />
          <span className="unvT_panelFile">{basename(props.file)}</span>
          {props.worktreeId === null ? null : <span className="unvT_panelWt">{props.worktreeId}</span>}
        </span>
        <span className="unvT_panelActions">
          <button className="unvT_panelTool" type="button" title={props.t('refresh')} onClick={() => setFrameKey((value) => value + 1)}>⟳</button>
          <button ref={closeRef} className="unvT_panelTool" type="button" title={props.t('collapse')} onClick={props.onClose}>✕</button>
        </span>
      </div>
      <iframe key={frameKey} className="unvT_frame" src={props.url} title={props.t('title')} onLoad={() => closeRef.current?.focus()} />
    </div>
  </div>
}

/** Univer grid glyph without an icon-package dependency. */
export function GridIcon({ size }: { readonly size: number }): React.ReactElement {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden>
    <rect x={2} y={2} width={5} height={5} rx={1} /><rect x={9} y={2} width={5} height={5} rx={1} />
    <rect x={2} y={9} width={5} height={5} rx={1} /><rect x={9} y={9} width={5} height={5} rx={1} />
  </svg>
}
