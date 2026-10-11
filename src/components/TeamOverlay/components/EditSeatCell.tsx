import { useState } from 'react'
import { SeatCompassGuide } from './SeatCompassGuide'
import { SeatDirectionMarker } from './SeatDirectionMarker'
import { SeatRotationGrip } from './SeatRotationGrip'
import { compactNameFontSize, getCompactNameLabel } from '../utils/compact-name'
import { seatDirectionLabel } from '../utils/seat-direction'
import type { UseSeatDragResult } from '../hooks/use-seat-drag'
import styles from '../team-overlay-modal.module.css'
import { useSeatDeleteRequest } from '@/contexts/seat-delete-context'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import { PixelAvatar } from '@/components/PixelAvatar'
import type { Employee, Seat } from '@/types'

// STEP B1: 編集中の座席カード。表示用(SeatCard/ViewSeatCell)とは別コンポーネントにする。
// 編集側が持たないのは在席状態と予定(編集中に変えられない情報)で、氏名・部署・操作に加えて
// アバターは表示側と同じものを出す — 席を掴んで動かす操作では顔で人を見分けるほうが速く、
// 表示⇄編集を行き来したときに同じ席が別人の見た目になるのも避けたい。
//
// 骨格は表示カード(.cell)と同じ縦積み(アバター→氏名→部署)にする。横並びにすると、
// Compact のセル幅(画面幅/6 = 実測56〜113px)から余白24px・アバター36pxを引いた残りが
// 氏名の取り分になり、幅0〜11pxまで潰れて文字が縦に積まれて読めなくなる。
// ドラッグの掴み手(drag_indicator)は置かない — カード自体が draggable で、
// 縦積みでは限られた高さをアイコンに割くより氏名に回すほうが席を見分けやすい。
// 1つのコンポーネントへ isEditing を通すと分岐が増え続けるため、責務ごとに分ける

type Props = {
  seat: Seat
  employee: Employee | null
  teamName: string
  // Compact は氏名を姓だけに詰めて可変フォントで収める(表示カードと同じ規則)
  isCompact: boolean
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
  isCompact,
  teamColor,
  isSelected,
  onSelect,
  seatMouseDragProps,
  seatTouchProps,
  onRotateSeat,
}: Props) => {
  // STEP D2: グリップドラッグ中かどうか。コンパスガイドの表示切り替えにだけ使う
  const [isDragging, setIsDragging] = useState(false)
  // §06-2: 削除要求ハンドラ。Providerで包まれていない(=編集ツリー外)場合はボタン自体を出さない
  const requestSeatDelete = useSeatDeleteRequest()
  const avatarConfig = useEmployeeAvatar(employee)
  // 支援技術へはフルネームを渡すため、表示ラベルとは別に持つ
  const fullName = employee ? employee.name : '空席'
  const label = employee && isCompact ? getCompactNameLabel(employee.name) : fullName

  return (
    <>
      <button
        type='button'
        data-seat-id={seat.id}
        data-seat-rotation={seat.rotation}
        className={`${styles.editcard}${isSelected ? ` ${styles.isSelected}` : ''}`}
        aria-label={`${fullName} ${seatDirectionLabel(seat.rotation)}`}
        // STEP D3: ネイティブbuttonなのでキーボード到達・Enter選択は既定で効くが、選択状態は
        // 見た目(isSelected枠)でしか伝わっていなかったため、支援技術にもaria-pressedで伝える
        aria-pressed={isSelected}
        onClick={onSelect}
        {...seatMouseDragProps}
        {...seatTouchProps}
      >
        {/* 空席でも枠だけは描く。人の有無でカードの縦位置がずれると行が揃わない */}
        <span className={styles.editcardAvatar}>
          {employee ? <PixelAvatar config={avatarConfig} size={28} /> : null}
        </span>
        <span
          className={styles.editcardName}
          style={isCompact ? { fontSize: compactNameFontSize(label) } : undefined}
        >
          {label}
        </span>
        {employee && <span className={styles.editcardDept}>{teamName}</span>}
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
      {/* §06-2: セルの削除。選択有無に関わらず常時出す(ゴミ箱投下と並ぶもう一方の削除経路)。
          回転グリップ(左上)と反対の右上へ置き、.rotationGripと同じ丸ボタン形状を
          .seatDeleteGripで流用しつつ位置とアイコン色だけ上書きする */}
      {requestSeatDelete && (
        <button
          type='button'
          className={`${styles.rotationGrip} ${styles.seatDeleteGrip}`}
          aria-label='座席を削除'
          onClick={(e) => {
            e.stopPropagation()
            requestSeatDelete(seat.id)
          }}
        >
          <span className='material-symbols-outlined' aria-hidden='true'>
            delete
          </span>
        </button>
      )}
    </>
  )
}
