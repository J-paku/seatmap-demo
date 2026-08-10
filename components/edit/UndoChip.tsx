// 07-admin-edit: 「元に戻す」チップ(対象オブジェクト直下・タップで直前1アクションをロールバック)
import { triggerHaptic } from '@/utils/haptic'
import e from './admin-edit.module.css'
// 次の操作または4秒経過で消去(消去タイミングは呼び出し側=SeatMapCanvasが管理)
type Props = {
  x: number
  y: number
  onUndo: () => void
}

export const UndoChip = ({ x, y, onUndo }: Props) => (
  <button
    type='button'
    className={`${e.editUndoChip} liquid-glass`}
    style={{ left: x, top: y }}
    onClick={(e) => {
      e.stopPropagation()
      triggerHaptic('light')
      onUndo()
    }}
  >
    元に戻す
  </button>
)
