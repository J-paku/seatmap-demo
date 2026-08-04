import type { PointerEvent as ReactPointerEvent } from 'react'
import { RESIZE_HANDLES } from '@/utils/resize-anchor'
import type { ResizeHandle } from '@/utils/resize-anchor'

// ゴーストの枠とリサイズハンドル。掴める要素なのでここだけ pointer-events を戻す

type Props = {
  rect: { left: number; top: number; width: number; height: number }
  outline: 'solid' | 'dashed'
  blocked: boolean
  resizable: boolean
  label: string
  onPointerDown: (e: ReactPointerEvent) => void
  onHandlePointerDown: (handle: ResizeHandle, e: ReactPointerEvent) => void
}

export const GhostPreview = ({
  rect,
  outline,
  blocked,
  resizable,
  label,
  onPointerDown,
  onHandlePointerDown,
}: Props) => (
  <div
    className={`ghost-preview is-${outline}${blocked ? ' is-blocked' : ''}`}
    style={rect}
    onPointerDown={onPointerDown}
    role='presentation'
  >
    <span className='ghost-preview-label'>{label}</span>
    {resizable &&
      RESIZE_HANDLES.map((handle) => (
        <span
          key={handle}
          className={`ghost-handle is-${handle}`}
          onPointerDown={(e) => onHandlePointerDown(handle, e)}
          role='presentation'
        />
      ))}
  </div>
)
