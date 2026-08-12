// 07-admin-edit / 仕様 05-4: 座席一括操作バー(FloatingActionBar)。
// 1席以上選択で表示し、選択席の DOM([data-seat-id])へ追従配置する。
// キャンバスには座席が描かれない(不変ルール1)ため、オーバーレイが閉じている編集セッション中は
// 追従先が存在せず下部中央フォールバックになる
import { useEffect, useState } from 'react'
import { triggerHaptic } from '@/utils/haptic'
import e from './admin-edit.module.css'

// 追従時に座席カードの上へ空ける間隔
const ANCHOR_GAP_PX = 12
// フォールバック(下部中央)の下端余白
const FALLBACK_BOTTOM_PX = 18

type Props = {
  seatIds: string[]
  // 単独選択の対象が在席なら「変更」、空席なら「配属」(判定は utils/seat-occupancy に一本化)
  isSelectedSeatOccupied: boolean
  onAssign: () => void
  onRotate: () => void
  onEnlarge: () => void
  onDelete: () => void
  onClearSelection: () => void
}

type Anchor = { left: number; top: number }

export const SeatActionBar = ({
  seatIds,
  isSelectedSeatOccupied,
  onAssign,
  onRotate,
  onEnlarge,
  onDelete,
  onClearSelection,
}: Props) => {
  const count = seatIds.length
  const isSingle = count === 1
  const [anchor, setAnchor] = useState<Anchor | null>(null)

  // 追従先はオーバーレイ側の DOM なので、レイアウトが確定する次フレームで実測する
  useEffect(() => {
    const target = seatIds[0]
    const frame = requestAnimationFrame(() => {
      const el = target ? document.querySelector<HTMLElement>(`[data-seat-id="${target}"]`) : null
      if (!el) {
        setAnchor(null)
        return
      }
      const rect = el.getBoundingClientRect()
      setAnchor({ left: rect.left + rect.width / 2, top: rect.top - ANCHOR_GAP_PX })
    })
    return () => cancelAnimationFrame(frame)
  }, [seatIds])

  // getBoundingClientRect はビューポート座標なので、追従・フォールバックとも fixed で置く
  const position = anchor
    ? { position: 'fixed' as const, left: anchor.left, top: anchor.top, transform: 'translate(-50%, -100%)' }
    : {
        position: 'fixed' as const,
        left: '50%',
        bottom: `calc(env(safe-area-inset-bottom) + ${FALLBACK_BOTTOM_PX}px)`,
        transform: 'translateX(-50%)',
      }

  return (
    <div
      className={e.seatActionBar}
      style={position}
      role='region'
      aria-label={`${count}席を選択中`}
      onClick={(event) => event.stopPropagation()}
    >
      <span className={e.seatActionCount}>✓ {count}席 選択中</span>
      {isSingle && (
        <button
          type='button'
          className={`pixel-btn ${e.seatActionBtn}`}
          onClick={() => {
            triggerHaptic('medium')
            onAssign()
          }}
        >
          <span className='material-symbols-outlined' aria-hidden='true'>
            person_add
          </span>
          {isSelectedSeatOccupied ? '変更' : '配属'}
        </button>
      )}
      {!isSingle && (
        <button
          type='button'
          className={`pixel-btn ${e.seatActionBtn}`}
          onClick={() => {
            triggerHaptic('medium')
            onRotate()
          }}
        >
          <span className='material-symbols-outlined' aria-hidden='true'>
            rotate_right
          </span>
          回転
        </button>
      )}
      {!isSingle && (
        <button
          type='button'
          className={`pixel-btn ${e.seatActionBtn}`}
          onClick={() => {
            triggerHaptic('medium')
            onEnlarge()
          }}
        >
          <span className='material-symbols-outlined' aria-hidden='true'>
            open_in_full
          </span>
          大型
        </button>
      )}
      <button
        type='button'
        className={`pixel-btn ${e.seatActionBtn} ${e.isDanger}`}
        aria-label='座席を削除'
        onClick={() => {
          triggerHaptic('error')
          onDelete()
        }}
      >
        <span className='material-symbols-outlined' aria-hidden='true'>
          delete
        </span>
        削除
      </button>
      <button
        type='button'
        className={`pixel-btn ${e.seatActionBtn}`}
        onClick={() => {
          triggerHaptic('light')
          onClearSelection()
        }}
      >
        <span className='material-symbols-outlined' aria-hidden='true'>
          close
        </span>
        選択解除
      </button>
    </div>
  )
}
