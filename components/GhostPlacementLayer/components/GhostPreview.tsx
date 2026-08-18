import type { PointerEvent as ReactPointerEvent } from 'react'
import { RESIZE_HANDLES } from '@/utils/layout/resize-anchor'
import type { ResizeHandle } from '@/utils/layout/resize-anchor'
import type { Rect } from '@/utils/layout/rect'
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

// 論理矩形を DOM へ出すときの丸め。機械判定が「画面寸法 = 論理寸法×倍率」を照合するのに要る
const round2 = (v: number): string => String(Math.round(v * 100) / 100)

// ゴーストの枠とリサイズハンドル。掴める要素なのでここだけ pointer-events を戻す

type Props = {
  rect: { left: number; top: number; width: number; height: number }
  // viewBox 単位の論理矩形。DOM へ出して「表示は実寸×倍率か」を外から検算できるようにする
  logicalRect: Rect | null
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
  logicalRect,
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
    // 名前はポインタを受けるこの要素が持つ。role='img' にはしない —
    // 名前バッジとリサイズハンドルが子孫にあり、img は子孫を支援技術から隠してしまう
    role='group'
    aria-label='配置プレビュー（ドラッグで移動）'
    data-ghost='frame'
    data-dragging={isDragging ? 'true' : 'false'}
    data-ghost-state={isDragging ? 'dragging' : resizingHandle ? 'resizing' : 'idle'}
    data-ghost-logical-x={logicalRect ? round2(logicalRect.x) : undefined}
    data-ghost-logical-y={logicalRect ? round2(logicalRect.y) : undefined}
    data-ghost-logical-w={logicalRect ? round2(logicalRect.w) : undefined}
    data-ghost-logical-h={logicalRect ? round2(logicalRect.h) : undefined}
  >
    {mode === 'move' && (
      <span className={styles.moveLabel} data-ghost='badge'>
        <span className='material-symbols-outlined' aria-hidden='true'>
          {blocked ? 'block' : 'open_with'}
        </span>
        {label}
      </span>
    )}
    {/* 中央ハンドル: 掴む場所を示す見た目だけの要素。ドラッグ自体は枠全体(.preview)が受ける */}
    <span className={styles.centerHandle} aria-hidden='true' data-ghost='handle'>
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
          // ポインタ専用の操作なのでフォーカス順には載せない。role='presentation' に戻すと
          // aria-label が捨てられて8個とも無名になる
          role='button'
          tabIndex={-1}
          aria-label='サイズを変更'
          data-ghost='resize-handle'
        />
      ))}
  </div>
)
