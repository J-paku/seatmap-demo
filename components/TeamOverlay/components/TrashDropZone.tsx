import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { TRASH_DROP_ZONE_ATTR } from '../utils/seat-drag-attrs'
import { SeatMapPortal } from '@/components/SeatMapPortal'

// STEP B3: ドラッグ中だけ現れるゴミ箱ドロップゾーン
//
// sticky アンカー + ポータル実体の二段構え。呼び出し側が置いたこのアンカー(position: sticky;
// top: 0; height: 0 の見えない点)の座標を getBoundingClientRect で測り、実体の円は
// SeatMapPortal 経由で body 直下へ fixed で描く。シート内に直接置くと overflow と
// スタッキングコンテキストで隠れるため、位置だけをアンカーから借りて別レイヤーに描く

export type TrashDropZoneProps = {
  // ドラッグ中かどうか。false の間はアンカーごと何も描かない
  isVisible: boolean
  // タッチ経路など外部で判定した「ドラッグがゾーン上にあるか」。マウス経路は内部の
  // onDragOver/onDragLeave で判定するため、外部判定が無ければ内部判定だけを使う
  isOver?: boolean
  // ドロップ確定時に呼ばれる。席の削除自体は呼び出し側(removeSeatAtCell)が行う
  onDrop: () => void
}

export const TrashDropZone = ({ isVisible, isOver: isOverExternal = false, onDrop }: TrashDropZoneProps) => {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [center, setCenter] = useState<{ top: number; left: number } | null>(null)
  const [isMouseOver, setIsMouseOver] = useState(false)

  const measure = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    setCenter({ top: rect.top + rect.height / 2, left: rect.left + rect.width / 2 })
  }, [])

  useLayoutEffect(() => {
    if (!isVisible) return
    measure()
    window.addEventListener('resize', measure)
    // 内側のスクロールコンテナのスクロールも拾うため capture で張る
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [isVisible, measure])

  if (!isVisible) return null

  const isOver = isOverExternal || isMouseOver

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsMouseOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // アイコン子要素への出入りでも dragleave が発火するため、実際にゾーン外へ出た時だけ解除する
    const related = e.relatedTarget as Node | null
    if (related && e.currentTarget.contains(related)) return
    setIsMouseOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsMouseOver(false)
    onDrop()
  }

  return (
    <>
      <div ref={anchorRef} className='team-ovl-trash-anchor' aria-hidden='true' />
      {center && (
        <SeatMapPortal>
          <div
            className={`team-ovl-trash-zone${isOver ? ' is-over' : ''}`}
            style={{ top: center.top, left: center.left }}
            {...{ [TRASH_DROP_ZONE_ATTR]: 'true' }}
            aria-label='ここへドロップして席を削除する'
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <span className='material-symbols-outlined team-ovl-trash-zone-icon' aria-hidden='true'>
              delete
            </span>
          </div>
        </SeatMapPortal>
      )}
    </>
  )
}
