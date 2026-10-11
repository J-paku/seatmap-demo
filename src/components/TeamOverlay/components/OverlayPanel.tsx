import type { ReactNode } from 'react'
import { TeamOverlayHeader } from './TeamOverlayHeader'
import type { UsePanelShellResult } from '../hooks/use-panel-shell'
import { anchorTransformOrigin } from '../utils/anchor-origin'
import { shouldClearHighlight, shouldClearSelection } from '../utils/judge-overlay-click'
import styles from '../team-overlay-modal.module.css'
import { SheetHandle } from '@/components/SheetHandle'
import type { TeamOverlayPayload } from '@/types'

// パネル(ダイアログの実ノード)とその上部。拡大の原点・開いた直後のクリックロック・下スワイプの追従を
// この1要素に載せ、ロードバー → ハンドル(Compact のみ)→ ヘッダーを描いてから中身(children)を置く。
// パネル内のクリックはここで止め、ヒット表示と編集中の選択を解除するかを判定する

type Props = {
  payload: TeamOverlayPayload
  isCompactMobile: boolean
  // 開いた直後の読込中(ロードバーを出す)
  loading: boolean
  // 開いた直後の誤クリック防止。true の間はパネルがポインターを受けない
  clickLocked: boolean
  // ヘッダーに出す在席数
  occupiedCount: number
  // パネルの実ノードへ取り付けるもの(use-panel-shell の戻り値)
  shell: UsePanelShellResult
  highlightSeatId: string | null
  onClearHighlight?: () => void
  isEditMode: boolean
  onClearSelection: () => void
  // 閉じる口(ハンドルとヘッダーの✕)。編集中の破棄確認を挟む guardedClose を渡す
  onClose: () => void
  children: ReactNode
}

export const OverlayPanel = ({
  payload: { teamColor, teamName, rect },
  isCompactMobile,
  loading,
  clickLocked,
  occupiedCount,
  shell: { sheetHandlers, dragStyle, setSheetNode },
  highlightSeatId,
  onClearHighlight,
  isEditMode,
  onClearSelection,
  onClose,
  children,
}: Props) => (
  <div
    className={`${styles.panel}${isCompactMobile ? ` ${styles.isCompact}` : ''}`}
    role='dialog'
    aria-modal='true'
    aria-label={`${teamName} 座席配置`}
    style={{
      transformOrigin: anchorTransformOrigin(rect),
      pointerEvents: clickLocked ? 'none' : 'auto',
      // ドラッグ中は指へ追従(transform はフックが直接書き込む)、離指後はここの
      // transition が復帰してスナップバックする
      transform: dragStyle.transform,
      transition: dragStyle.transition,
      willChange: dragStyle.willChange,
    }}
    onClick={e => {
      e.stopPropagation()
      if (shouldClearHighlight(e.target as HTMLElement, highlightSeatId)) onClearHighlight?.()
      if (shouldClearSelection(e.target as HTMLElement, isEditMode)) {
        onClearSelection()
      }
    }}
    {...sheetHandlers}
    ref={setSheetNode}
  >
    {loading && <div className={styles.loadbar} style={{ background: teamColor }} />}
    {/* ハンドルは Compact のみ描画する */}
    {isCompactMobile && (
      <SheetHandle
        stripClassName={styles.handle}
        barClassName={styles.handleBar}
        heightPx={48}
        onClose={onClose}
      />
    )}
    <TeamOverlayHeader
      teamName={teamName}
      teamColor={teamColor}
      occupiedCount={occupiedCount}
      isCompactMobile={isCompactMobile}
      onClose={onClose}
    />
    {children}
  </div>
)
