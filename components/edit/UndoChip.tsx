// 07-admin-edit: 「元に戻す」チップ(対象オブジェクト直下・タップで直前1アクションをロールバック)
import { triggerHaptic } from '@/utils/haptic'
import e from './admin-edit.module.css'
// 次の操作または4秒経過で消去(消去タイミングは呼び出し側=SeatMapCanvasが管理)
type Props = {
  x: number
  y: number
  // 操作種別ごとの文言(「削除しました」等)
  message: string
  // 即時保存済みの場合のみ true を渡す。先頭に check_circle アイコンを表示する
  // (既定 false = 現状のアイコンなし表示を維持)
  showSavedIcon?: boolean
  // 削除時のみ: 消えた位置に重ねる残像フレーム(画面座標)。opacity 0.45 は原本のインライン固定値
  frame?: { x: number; y: number; w: number; h: number } | null
  onUndo: () => void
}

export const UndoChip = ({ x, y, message, showSavedIcon = false, frame, onUndo }: Props) => (
  <>
    {frame && (
      <div
        className={e.editUndoFrame}
        style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h, opacity: 0.45 }}
        aria-hidden='true'
      />
    )}
    <div className={`${e.editUndoChip} liquid-glass`} style={{ left: x, top: y }}>
      {showSavedIcon && (
        <span className='material-symbols-outlined' aria-hidden='true'>
          check_circle
        </span>
      )}
      <span className={e.editUndoMessage}>{message}</span>
      <button
        type='button'
        className={e.editUndoAction}
        aria-label='直前の変更を戻す'
        onClick={(ev) => {
          ev.stopPropagation()
          triggerHaptic('light')
          onUndo()
        }}
      >
        <span className='material-symbols-outlined' aria-hidden='true'>
          undo
        </span>
        戻す
      </button>
    </div>
  </>
)
