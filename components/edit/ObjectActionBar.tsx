// 会議室・家具のフローティングアクションバー(編集モード中に1件選択時・近傍に表示)
import e from './admin-edit.module.css'
type Props = {
  x: number
  y: number
  onReposition: () => void
  onDelete: () => void
}

export const ObjectActionBar = ({ x, y, onReposition, onDelete }: Props) => (
  <div className={e.seatActionBar} style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
    <button type='button' className={`pixel-btn ${e.seatActionBtn}`} onClick={onReposition}>
      配置し直す
    </button>
    <button type='button' className={`pixel-btn ${e.seatActionBtn} ${e.isDanger}`} onClick={onDelete}>
      削除
    </button>
  </div>
)
