import type { PointerEvent as ReactPointerEvent } from 'react'
import { RESIZE_HANDLES } from '@/utils/resize-anchor'
import type { ResizeHandle } from '@/utils/resize-anchor'
import styles from '../ghost-placement.module.css'

const HANDLE_CLASS: Record<ResizeHandle, string> = {
  nw: styles.isNw,
  n: styles.isN,
  ne: styles.isNe,
  e: styles.isE,
  se: styles.isSe,
  s: styles.isS,
  sw: styles.isSw,
  w: styles.isW,
}


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
    className={`${styles.preview}${outline === 'dashed' ? ` ${styles.isDashed}` : ''}${blocked ? ` ${styles.isBlocked}` : ''}`}
    style={rect}
    onPointerDown={onPointerDown}
    role='presentation'
  >
    <span className={styles.previewLabel}>{label}</span>
    {resizable &&
      RESIZE_HANDLES.map((handle) => (
        <span
          key={handle}
          className={`${styles.handle} ${HANDLE_CLASS[handle]}`}
          onPointerDown={(e) => onHandlePointerDown(handle, e)}
          role='presentation'
        />
      ))}
  </div>
)
