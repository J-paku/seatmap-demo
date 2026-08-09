// 07-admin-edit: チームレイアウトエディタ(チームラベルタップ時のモーダル) — 行・列ステッパー+適用/閉じる
import { useState } from 'react'
import type { Team } from '@/types'
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'
import e from './admin-edit.module.css'

type Props = {
  team: Team
  seatCount: number
  onApply: (rows: number, cols: number) => { ok: true } | { ok: false; message: string }
  onClose: () => void
}

// 初期行×列は現在座席数から概算(できるだけ正方形に近い形)
const initialCols = (count: number) => Math.max(1, Math.ceil(Math.sqrt(count)))

export const TeamRelayoutModal = ({ team, seatCount, onApply, onClose }: Props) => {
  const [cols, setCols] = useState(() => initialCols(seatCount))
  const [rows, setRows] = useState(() => Math.max(1, Math.ceil(seatCount / initialCols(seatCount))))
  const [error, setError] = useState<string | null>(null)
  // 下スワイプで閉じる(スクロール領域なし)
  const { sheetRef, bind } = useSwipeDismiss({ onClose })

  const clampStep = (v: number) => Math.max(1, Math.min(20, v))

  const handleApply = () => {
    const result = onApply(rows, cols)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onClose()
  }

  return (
    <div className={e.editDialogBackdrop} onClick={onClose}>
      <div
        ref={sheetRef}
        className={`${e.editSheet} ${e.editRelayoutModal}`}
        role='dialog'
        aria-modal='true'
        aria-label='チームレイアウト編集'
        onClick={(e) => e.stopPropagation()}
        {...bind}
      >
        <h3 className={e.editSheetTitle}>{team.name}のレイアウト</h3>
        <p className={e.editRelayoutCount}>現在の座席数: {seatCount}席</p>

        <div className={e.editStepperRow}>
          <span className={e.editStepperLabel}>行</span>
          <button type='button' className={`pixel-btn ${e.editStepperBtn}`} onClick={() => setRows((v) => clampStep(v - 1))}>
            −
          </button>
          <span className={e.editStepperValue}>{rows}</span>
          <button type='button' className={`pixel-btn ${e.editStepperBtn}`} onClick={() => setRows((v) => clampStep(v + 1))}>
            ＋
          </button>
        </div>

        <div className={e.editStepperRow}>
          <span className={e.editStepperLabel}>列</span>
          <button type='button' className={`pixel-btn ${e.editStepperBtn}`} onClick={() => setCols((v) => clampStep(v - 1))}>
            −
          </button>
          <span className={e.editStepperValue}>{cols}</span>
          <button type='button' className={`pixel-btn ${e.editStepperBtn}`} onClick={() => setCols((v) => clampStep(v + 1))}>
            ＋
          </button>
        </div>

        {error && <p className={e.editRelayoutError}>{error}</p>}

        <div className={e.editDialogActions}>
          <button type='button' className={`pixel-btn ${e.editDialogCancel}`} onClick={onClose}>
            閉じる
          </button>
          <button type='button' className={`pixel-btn ${e.editDialogConfirm}`} onClick={handleApply}>
            適用
          </button>
        </div>
      </div>
    </div>
  )
}
