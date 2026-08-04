// 07-admin-edit: 座席フローティングアクションバー(編集モード中に座席1席選択時・近傍に表示)
type Props = {
  x: number
  y: number
  onAssign: () => void
  onChangeTeam: () => void
  onDelete: () => void
}

export const SeatActionBar = ({ x, y, onAssign, onChangeTeam, onDelete }: Props) => (
  <div className='seat-action-bar' style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
    <button type='button' className='pixel-btn seat-action-btn' onClick={onAssign}>
      配属
    </button>
    <button type='button' className='pixel-btn seat-action-btn' onClick={onChangeTeam}>
      チーム変更
    </button>
    <button type='button' className='pixel-btn seat-action-btn is-danger' onClick={onDelete}>
      削除
    </button>
  </div>
)
