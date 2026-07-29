import { useMemo, useRef } from 'react'
import { SeatGridFrame } from './components/SeatGridFrame'
import { SeatLayoutHeader } from './components/SeatLayoutHeader'
import { SheetDragHandle } from './components/SheetDragHandle'
import { TeamOverlayHeader } from './components/TeamOverlayHeader'
import { useIsCompactMobile } from './lib/use-compact-mobile'
import { useModalShell } from './lib/use-modal-shell'
import { useOverlaySession } from './lib/use-overlay-session'
import { anchorTransformOrigin } from './utils/anchor-origin'
import { COMPACT_SIDE_PADDING_PX, buildSeatGrid } from './utils/seat-grid'
import type { TeamOverlayProps } from './type'
import { useSwipeDismiss } from '@/lib/use-swipe-dismiss'

// 10: チームバウンダリクリックで開く大型オーバーレイ(座席グリッド全体)
// クリックしたバウンダリ中心から膨らむように開く。中央固定拡大ではない
// 幅 760px を境に、シェル形状・座席グリッド・入力モデルがまるごと切り替わる

export type { TeamOverlayPayload } from './type'

type Props = TeamOverlayProps

export const TeamOverlay = ({
  payload,
  seats,
  employeeById,
  presenceMap,
  onClose,
  onSeatClick,
  highlightSeatId = null,
  onClearHighlight,
}: Props) => {
  const bodyRef = useRef<HTMLDivElement>(null)
  const isCompactMobile = useIsCompactMobile()
  const { loading, clickLocked, syncedAt } = useOverlaySession(payload !== null, bodyRef)
  // 下スワイプで閉じるのは Compact だけの挙動
  const { sheetRef, bind } = useSwipeDismiss({
    onClose,
    enabled: payload !== null && isCompactMobile,
    scrollGateRef: bodyRef,
  })
  useModalShell(payload !== null, sheetRef, onClose)

  const teamSeats = useMemo(
    () => (payload ? seats.filter((s) => s.teamId === payload.teamId) : []),
    [seats, payload]
  )
  const grid = useMemo(() => buildSeatGrid(teamSeats), [teamSeats])
  const occupiedCount = useMemo(() => teamSeats.filter((s) => s.employeeId).length, [teamSeats])

  if (!payload) return null

  const { teamColor, teamName, rect } = payload
  const sidePadding = isCompactMobile ? COMPACT_SIDE_PADDING_PX : 0

  return (
    <div
      className={`team-ovl-wrap${isCompactMobile ? ' is-compact' : ''}`}
      onClick={(e) => {
        // ラッパー余白クリックで閉じる(パネル自身のクリックは stopPropagation)
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className='team-ovl-backdrop' onClick={onClose} />
      <div
        ref={sheetRef}
        className={`team-ovl-panel${isCompactMobile ? ' is-compact' : ''}`}
        role='dialog'
        aria-modal='true'
        aria-label={`${teamName} 座席配置`}
        style={{
          transformOrigin: anchorTransformOrigin(rect),
          pointerEvents: clickLocked ? 'none' : 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        {...bind}
      >
        {loading && <div className='team-ovl-loadbar' style={{ background: teamColor }} />}
        {/* ハンドルは Compact のみ描画する */}
        {isCompactMobile && <SheetDragHandle onClose={onClose} />}
        <TeamOverlayHeader
          teamName={teamName}
          teamColor={teamColor}
          occupiedCount={occupiedCount}
          isCompactMobile={isCompactMobile}
          onClose={onClose}
        />

        {/* 本文 — 座席配置セクション */}
        <div ref={bodyRef} className='team-ovl-body'>
          <section className='team-ovl-section'>
            <SeatLayoutHeader
              seatCount={teamSeats.length}
              loading={loading}
              syncedAt={syncedAt}
              sidePadding={sidePadding}
            />
            <SeatGridFrame
              isCompactMobile={isCompactMobile}
              grid={grid}
              employeeById={employeeById}
              presenceMap={presenceMap}
              teamName={teamName}
              teamColor={teamColor}
              loading={loading}
              highlightSeatId={highlightSeatId}
              onSeatClick={onSeatClick}
              onClearHighlight={onClearHighlight}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
