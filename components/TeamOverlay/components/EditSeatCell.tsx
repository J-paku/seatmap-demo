import { useState } from 'react'
import { SeatCompassGuide } from './SeatCompassGuide'
import { SeatDirectionMarker } from './SeatDirectionMarker'
import { SeatRotationGrip } from './SeatRotationGrip'
import { seatDirectionLabel } from '../utils/seat-direction'
import type { UseSeatDragResult } from '../hooks/use-seat-drag'
import type { Employee, Seat } from '@/types'

// STEP B1: 編集中の座席カード。表示用(SeatCard/ViewSeatCell)とは別コンポーネントにする。
// 表示側は在席状態・予定・アバターを持つが、編集側は氏名・部署・操作(ドラッグハンドル)だけでよい。
// 1つのコンポーネントへ isEditing を通すと分岐が増え続けるため、責務ごとに分ける

type Props = {
  seat: Seat
  employee: Employee | null
  teamName: string
  // STEP D2: 向きの帯(SeatDirectionMarker)がチーム色を薄めるのに使う。解決済みの値をそのまま渡す
  teamColor: string
  isSelected: boolean
  onSelect: () => void
  // STEP B2: マウス(HTML5 DnD)とタッチ(Pointer)、両経路のドラッグ開始点をこのボタンへ集約する
  seatMouseDragProps: UseSeatDragResult['seatMouseDragProps']
  seatTouchProps: UseSeatDragResult['seatTouchProps']
  // STEP D1: 回転グリップの確定口。選択中だけ描くグリップからそのまま渡す
  onRotateSeat: (seatId: string, rotation: Seat['rotation']) => void
}

export const EditSeatCell = ({
  seat,
  employee,
  teamName,
  teamColor,
  isSelected,
  onSelect,
  seatMouseDragProps,
  seatTouchProps,
  onRotateSeat,
}: Props) => {
  // STEP D2: グリップドラッグ中かどうか。コンパスガイドの表示切り替えにだけ使う
  const [isDragging, setIsDragging] = useState(false)

  return (
    <>
      <button
        type='button'
        data-seat-id={seat.id}
        data-seat-rotation={seat.rotation}
        className={`team-ovl-editcard${isSelected ? ' is-selected' : ''}`}
        aria-label={`${employee ? employee.name : '空席'} ${seatDirectionLabel(seat.rotation)}`}
        // STEP D3: ネイティブbuttonなのでキーボード到達・Enter選択は既定で効くが、選択状態は
        // 見た目(is-selected枠)でしか伝わっていなかったため、支援技術にもaria-pressedで伝える
        aria-pressed={isSelected}
        onClick={onSelect}
        {...seatMouseDragProps}
        {...seatTouchProps}
      >
        <span className='team-ovl-editcard-text'>
          <span className='team-ovl-editcard-name'>{employee ? employee.name : '空席'}</span>
          {employee && <span className='team-ovl-editcard-dept'>{teamName}</span>}
        </span>
        <span className='material-symbols-outlined team-ovl-editcard-handle' aria-hidden='true'>
          drag_indicator
        </span>
        {/* STEP D2: 向きの帯は編集中は常時出す。矢印アイコンにはしない(小さいカードで潰れるため) */}
        <SeatDirectionMarker rotation={seat.rotation} teamColor={teamColor} />
      </button>
      {/* STEP D1: 回転グリップは編集中かつ選択中の時だけ。カード本体と兄弟にして
          ボタンのdraggable継承・要素ネストの問題を避ける(触ってもカードのドラッグを誘発しない) */}
      {isSelected && (
        <SeatRotationGrip
          seatId={seat.id}
          rotation={seat.rotation}
          onRotate={onRotateSeat}
          onDraggingChange={setIsDragging}
        />
      )}
      {/* STEP D2: コンパスガイドはグリップをドラッグしている間だけ。終わったら消す */}
      {isSelected && isDragging && <SeatCompassGuide />}
    </>
  )
}
