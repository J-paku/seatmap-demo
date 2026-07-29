// Compact のみ描画するシートハンドル。タップでも閉じる
// data-handle は useSwipeDismiss がスクロールゲートを無視してよい起点かの判定に使う

type Props = {
  heightPx?: number
  onClose: () => void
}

export const SheetDragHandle = ({ heightPx = 48, onClose }: Props) => (
  <button
    type='button'
    className='team-ovl-handle'
    data-handle='true'
    style={{ height: heightPx }}
    aria-label='閉じる'
    onClick={onClose}
  >
    <span className='team-ovl-handle-bar' data-handle='true' />
  </button>
)
