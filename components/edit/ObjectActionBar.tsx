// 会議室・家具のフローティングアクションバー(編集モード中に1件選択時・近傍に表示)
type Props = {
  x: number
  y: number
  onReposition: () => void
  onDelete: () => void
}

export const ObjectActionBar = ({ x, y, onReposition, onDelete }: Props) => (
  <div className='seat-action-bar' style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
    <button type='button' className='pixel-btn seat-action-btn' onClick={onReposition}>
      配置し直す
    </button>
    <button type='button' className='pixel-btn seat-action-btn is-danger' onClick={onDelete}>
      削除
    </button>
  </div>
)
