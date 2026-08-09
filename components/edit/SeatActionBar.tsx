// 07-admin-edit: 座席フローティングアクションバー(編集モード中に座席1席選択時・近傍に表示)
import e from './admin-edit.module.css'
type Props = {
  x: number
  y: number
  onAssign: () => void
  onChangeTeam: () => void
  onDelete: () => void
}

export const SeatActionBar = ({ x, y, onAssign, onChangeTeam, onDelete }: Props) => (
  <div className={e.seatActionBar} style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
    <button type='button' className={`pixel-btn ${e.seatActionBtn}`} onClick={onAssign}>
      配属
    </button>
    <button type='button' className={`pixel-btn ${e.seatActionBtn}`} onClick={onChangeTeam}>
      チーム変更
    </button>
    <button type='button' className={`pixel-btn ${e.seatActionBtn} ${e.isDanger}`} onClick={onDelete}>
      削除
    </button>
  </div>
)
