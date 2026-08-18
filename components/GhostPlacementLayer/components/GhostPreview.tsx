import type { PointerEvent as ReactPointerEvent } from 'react'
import { RESIZE_HANDLES } from '@/utils/layout/resize-anchor'
import type { ResizeHandle } from '@/utils/layout/resize-anchor'
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
  // 枠を掴んで移動している間だけ true
  isDragging: boolean
  // リサイズ中に掴んでいるハンドル。掴んだ1つだけを強調するために要る
  resizingHandle: ResizeHandle | null
  // 移動モード('reposition')のときだけ枠上部にラベルバッジを出す(§04-2)
  mode: 'create' | 'move'
  label: string
  onPointerDown: (e: ReactPointerEvent) => void
  onHandlePointerDown: (handle: ResizeHandle, e: ReactPointerEvent) => void
}

export const GhostPreview = ({
  rect,
  outline,
  blocked,
  resizable,
  isDragging,
  resizingHandle,
  mode,
  label,
  onPointerDown,
  onHandlePointerDown,
}: Props) => (
  <div
    className={`${styles.preview}${outline === 'dashed' ? ` ${styles.isDashed}` : ''}${blocked ? ` ${styles.isBlocked}` : ''}${isDragging ? ` ${styles.isDragging}` : ''}`}
    style={rect}
    onPointerDown={onPointerDown}
    role='presentation'
    data-ghost='frame'
    data-ghost-state={isDragging ? 'dragging' : resizingHandle ? 'resizing' : 'idle'}
  >
    {mode === 'move' && (
      <span className={styles.moveLabel}>
        <span className='material-symbols-outlined' aria-hidden='true'>
          {blocked ? 'block' : 'open_with'}
        </span>
        {label}
      </span>
    )}
    {/* 中央ハンドル: 掴む場所を示す見た目だけの要素。ドラッグ自体は枠全体(.preview)が受ける */}
    <span className={styles.centerHandle} role='img' aria-label='配置プレビュー（ドラッグで移動）'>
      <span className='material-symbols-outlined' aria-hidden='true'>
        {blocked ? 'block' : 'drag_pan'}
      </span>
    </span>
    {/* 衝突中はリサイズハンドルを隠す(§04-2) */}
    {resizable &&
      !blocked &&
      RESIZE_HANDLES.map((handle) => (
        <span
          key={handle}
          className={`${styles.handle} ${HANDLE_CLASS[handle]}${resizingHandle === handle ? ` ${styles.isActive}` : ''}`}
          onPointerDown={(e) => onHandlePointerDown(handle, e)}
          role='presentation'
          aria-label='サイズを変更'
        />
      ))}
  </div>
)
