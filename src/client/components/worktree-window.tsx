import * as React from 'react'
import type { WorktreeState } from '../../shared/wire/state.ts'
import type { Translate } from '../dsh.ts'
import { basename } from '../conversation/univer-target-definition.ts'
import { startGateway } from '../api/univer-api.ts'
import { UnitChips, unitViewerUrl } from './unit-chips.tsx'

interface Point { readonly x: number; readonly y: number }
interface Size { readonly width: number; readonly height: number }
const HANDLES = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'] as const

/** Live floating Viewer window for one active worktree. */
export function WorktreeWindow(props: { readonly file: string; readonly worktree: WorktreeState; readonly t: Translate; readonly onDismiss: () => void }): React.ReactElement {
  const [folded, setFolded] = React.useState(false)
  const [maximized, setMaximized] = React.useState(false)
  const [offset, setOffset] = React.useState<Point>({ x: 0, y: 0 })
  const [size, setSize] = React.useState<Size>({ width: 480, height: 340 })
  const [selected, setSelected] = React.useState<string | undefined>()
  const units = props.worktree.units
  const selectedUnit = selected !== undefined && units.some((unit) => unit.unitId === selected) ? selected : units[0]?.unitId
  const url = unitViewerUrl(props.worktree.worktreeUrl, units, selectedUnit, 'worktree')
  const title = props.worktree.name || props.worktree.worktreeId

  const onDragStart = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0 || (event.target as Element).closest('button') !== null) return
    const element = event.currentTarget
    const start = { x: event.clientX, y: event.clientY, offset, moved: false }
    try { element.setPointerCapture(event.pointerId) } catch (error) { /* unavailable in synthetic DOMs */ }
    const move = (next: PointerEvent): void => {
      const dx = next.clientX - start.x
      const dy = next.clientY - start.y
      if (Math.abs(dx) >= 5 || Math.abs(dy) >= 5) start.moved = true
      if (start.moved) setOffset({ x: start.offset.x + dx, y: start.offset.y + dy })
    }
    const up = (): void => {
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointercancel', up)
      if (!start.moved && !maximized) setMaximized(true)
    }
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointercancel', up)
  }

  const resize = (direction: typeof HANDLES[number]) => (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault(); event.stopPropagation()
    const element = event.currentTarget
    const start = { x: event.clientX, y: event.clientY, size, offset }
    const move = (next: PointerEvent): void => {
      const dx = next.clientX - start.x
      const dy = next.clientY - start.y
      let width = start.size.width
      let height = start.size.height
      let x = start.offset.x
      let y = start.offset.y
      if (direction.includes('e')) { width = clamp(start.size.width + dx, 280, 1600); x = start.offset.x + width - start.size.width }
      if (direction.includes('w')) width = clamp(start.size.width - dx, 280, 1600)
      if (direction.includes('s')) height = clamp(start.size.height + dy, 180, 1000)
      if (direction.includes('n')) { height = clamp(start.size.height - dy, 180, 1000); y = start.offset.y + start.size.height - height }
      setSize({ width, height }); setOffset({ x, y })
    }
    const up = (): void => {
      element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up)
    }
    element.addEventListener('pointermove', move); element.addEventListener('pointerup', up); element.addEventListener('pointercancel', up)
  }

  const className = ['uvf_win', folded ? 'uvf_win_folded' : '', maximized ? 'uvf_win_max' : ''].filter(Boolean).join(' ')
  const style = maximized ? undefined : folded
    ? { transform: `translate(${String(offset.x)}px, ${String(offset.y)}px)` }
    : { width: size.width, height: size.height, transform: `translate(${String(offset.x)}px, ${String(offset.y)}px)` }
  return <div className={className} style={style}>
    <div className="uvf_bar" onPointerDown={onDragStart}>
      <span className="uvf_pulse" title={props.t('dock.live')} />
      <span className="uvf_title">{title}<span className="uvf_file"> · {basename(props.file)}</span></span>
      <span className="uvf_chip" data-status={props.worktree.status}>{props.t(`dock.${props.worktree.status}`)}</span>
      <button type="button" className="uvf_btn" title={props.t(folded ? 'dock.expand' : 'dock.fold')} onClick={() => setFolded((value) => !value)}>{folded ? '+' : '−'}</button>
      <button type="button" className="uvf_btn" title={props.t(maximized ? 'dock.restore' : 'dock.maximize')} onClick={() => setMaximized((value) => !value)}>{maximized ? '⤡' : '⤢'}</button>
      <button type="button" className="uvf_btn" title={props.t('dock.close')} onClick={props.onDismiss}>✕</button>
    </div>
    {folded ? null : <>
      <UnitChips units={units} selected={selectedUnit} t={props.t} onSelect={setSelected} />
      {url === undefined
        ? <div className="uvf_note"><span>{props.t('dock.gatewayDown')}</span><button type="button" onClick={() => void startGateway()}>{props.t('dock.startGateway')}</button></div>
        : <iframe className="uvf_frame" src={url} title={title} />}
    </>}
    {!folded && !maximized ? HANDLES.map((direction) => <div key={direction} className={`uvf_handle uvf_h_${direction}`} onPointerDown={resize(direction)} />) : null}
  </div>
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
