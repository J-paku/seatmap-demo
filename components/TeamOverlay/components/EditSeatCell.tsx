import type { Employee, Seat } from '@/types'

// STEP B1: 編集中の座席カード。表示用(SeatCard/ViewSeatCell)とは別コンポーネントにする。
// 表示側は在席状態・予定・アバターを持つが、編集側は氏名・部署・操作(ドラッグハンドル)だけでよい。
// 1つのコンポーネントへ isEditing を通すと分岐が増え続けるため、責務ごとに分ける

type Props = {
  seat: Seat
  employee: Employee | null
  teamName: string
  isSelected: boolean
  onSelect: () => void
}

export const EditSeatCell = ({ seat, employee, teamName, isSelected, onSelect }: Props) => (
  <button
    type='button'
    data-seat-id={seat.id}
    className={`team-ovl-editcard${isSelected ? ' is-selected' : ''}`}
    onClick={onSelect}
  >
    <span className='team-ovl-editcard-text'>
      <span className='team-ovl-editcard-name'>{employee ? employee.name : '空席'}</span>
      {employee && <span className='team-ovl-editcard-dept'>{teamName}</span>}
    </span>
    {/* 操作の可視化のみ。実際のドラッグ配線は別STEPの担当 */}
    <span className='material-symbols-outlined team-ovl-editcard-handle' aria-hidden='true'>
      drag_indicator
    </span>
  </button>
)
