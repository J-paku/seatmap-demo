// 07-admin-edit: 「元に戻す」チップ(対象オブジェクト直下・タップで直前1アクションをロールバック)
// 次の操作または5秒経過で消去(消去タイミングは呼び出し側=SeatMapCanvasが管理)
type Props = {
  x: number
  y: number
  onUndo: () => void
}

export const UndoChip = ({ x, y, onUndo }: Props) => (
  <button
    type='button'
    className='edit-undo-chip'
    style={{ left: x, top: y }}
    onClick={(e) => {
      e.stopPropagation()
      onUndo()
    }}
  >
    元に戻す
  </button>
)
