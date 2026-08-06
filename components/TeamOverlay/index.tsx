import { useCallback, useMemo, useRef } from 'react'
import { Minimap } from './components/Minimap'
import { SeatDragGhost } from './components/SeatDragGhost'
import { SeatGridFrame } from './components/SeatGridFrame'
import { SeatLayoutHeader } from './components/SeatLayoutHeader'
import { TeamOverlayHeader } from './components/TeamOverlayHeader'
import { TrashDropZone } from './components/TrashDropZone'
import { useIsCompactMobile } from './hooks/use-compact-mobile'
import { useModalShell } from './hooks/use-modal-shell'
import { useOverlayEditMode } from './hooks/use-overlay-edit-mode'
import { useOverlaySession } from './hooks/use-overlay-session'
import { useSeatCommit } from './hooks/use-seat-commit'
import { SEAT_GRID_CELL_ATTR, useSeatDrag } from './hooks/use-seat-drag'
import { useSeatLayoutCompose } from './hooks/use-seat-layout-compose'
import { useSeatSelection } from './hooks/use-seat-selection'
import { anchorTransformOrigin } from './utils/anchor-origin'
import { COMPACT_SIDE_PADDING_PX } from './utils/seat-grid'
import type { TeamOverlayProps } from './type'
import { SheetHandle } from '@/components/SheetHandle'
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'
import type { Rect } from '@/utils/rect'

// 10: チームバウンダリクリックで開く大型オーバーレイ(座席グリッド全体)
// クリックしたバウンダリ中心から膨らむように開く。中央固定拡大ではない
// 幅 760px を境に、シェル形状・座席グリッド・入力モデルがまるごと切り替わる

export type { TeamOverlayPayload } from './type'
export type { MinimapArea, MinimapFurniture, MinimapKind } from './type'

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
  minimapAreas,
  minimapFurniture,
  minimapTeamArea = null,
  minimapViewBox,
}: Props) => {
  const bodyRef = useRef<HTMLDivElement>(null)
  const isCompactMobile = useIsCompactMobile()
  const { loading, clickLocked, syncedAt } = useOverlaySession(payload !== null, bodyRef)

  const teamSeats = useMemo(
    () => (payload ? seats.filter((s) => s.teamId === payload.teamId) : []),
    [seats, payload]
  )
  const editMode = useOverlayEditMode()
  const seatGrid = useSeatLayoutCompose({
    teamSeats,
    isEditMode: editMode.isEditMode,
    grid: editMode.grid,
    draft: editMode.draft,
  })
  const occupiedCount = useMemo(() => teamSeats.filter((s) => s.employeeId).length, [teamSeats])

  // STEP B1: 編集中セルの選択(席か空セルのどちらか1件だけ)。編集モードを抜けると自動で消える
  const seatSelection = useSeatSelection(editMode.isEditMode)

  // STEP B2/B3: 編集中セルのドラッグ移動/入替とゴミ箱への削除。moveSeat/clearSeatは
  // どちらもuseOverlayEditModeが持つ唯一のgrid差分適用口をそのまま渡す
  const seatDrag = useSeatDrag({ moveSeat: editMode.moveSeat, clearSeat: editMode.clearSeat })

  // STEP A5: 保存(commit)の呼び口。保存ボタン付きの編集ドックは PHASE D の担当なので、
  // ここでは「終了」から保存できるところまでを配線する
  const seatCommit = useSeatCommit({
    teamId: payload?.teamId ?? null,
    grid: editMode.grid,
    draft: editMode.draft,
  })

  // 「終了」= 保存してから編集モードを抜ける。editMode.cancel自体は「破棄」ではなく
  // grid/draft/isEditModeの後始末だけを担う関数で、保存済みの内容を打ち消す意味は持たない
  // (保存が無い=変更0件の場合はcommitが即座に戻るため、結果的に旧来の「終了」と同じになる)。
  // isSaving中の二重押下はここで弾く(SeatLayoutHeaderのボタン自体は無効化できないため)
  const handleFinishEdit = useCallback(() => {
    if (seatCommit.isSaving) return
    void seatCommit.commit().then(() => editMode.cancel())
  }, [seatCommit, editMode])

  // 編集中は✕・背景・Escで閉じられないようにする(未保存の変更を無言で捨てない)。
  // 編集モードを抜けられるのは SeatLayoutHeader の「終了」(onExitEdit)だけにする
  const guardedClose = useCallback(() => {
    if (editMode.isEditMode) return
    onClose()
  }, [editMode.isEditMode, onClose])

  // 下スワイプで閉じるのは Compact だけの挙動
  const { sheetRef, bind } = useSwipeDismiss({
    onClose: guardedClose,
    enabled: payload !== null && isCompactMobile,
    scrollGateRef: bodyRef,
  })
  useModalShell(payload !== null, sheetRef, guardedClose)

  if (!payload) return null

  const { teamColor, teamName, rect } = payload
  const sidePadding = isCompactMobile ? COMPACT_SIDE_PADDING_PX : 0
  const teamRect: Rect = minimapTeamArea ?? { x: 0, y: 0, w: 0, h: 0 }

  return (
    <div
      className={`team-ovl-wrap${isCompactMobile ? ' is-compact' : ''}`}
      onClick={(e) => {
        // ラッパー余白クリックで閉じる(パネル自身のクリックは stopPropagation)
        if (e.target === e.currentTarget) guardedClose()
      }}
    >
      <div className='team-ovl-backdrop' onClick={guardedClose} />
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
        onClick={(e) => {
          e.stopPropagation()
          // ヒット表示はその席自身のクリック以外で解除する。座席以外(空白・ヘッダー・
          // ミニマップ等)をクリックした時に消えなかったのが元の不具合。ヒット席自身の
          // クリックだけは社員詳細を開く経路と競合するため除外する
          if (highlightSeatId) {
            const seatEl = (e.target as HTMLElement).closest<HTMLElement>('[data-seat-id]')
            if (seatEl?.dataset.seatId !== highlightSeatId) onClearHighlight?.()
          }
          // 編集中はセル(席・空セルどちらも data-seat-grid-cell を持つ)以外のタップで選択解除する。
          // グリッド余白・オーバーレイ余白のどちらもこの1箇所で拾える
          if (editMode.isEditMode && !(e.target as HTMLElement).closest(`[${SEAT_GRID_CELL_ATTR}]`)) {
            seatSelection.clearSelection()
          }
        }}
        {...bind}
      >
        {loading && <div className='team-ovl-loadbar' style={{ background: teamColor }} />}
        {/* ハンドルは Compact のみ描画する */}
        {isCompactMobile && (
          <SheetHandle
            stripClassName='team-ovl-handle'
            barClassName='team-ovl-handle-bar'
            heightPx={48}
            onClose={guardedClose}
          />
        )}
        <TeamOverlayHeader
          teamName={teamName}
          teamColor={teamColor}
          occupiedCount={occupiedCount}
          isCompactMobile={isCompactMobile}
          onClose={guardedClose}
        />

        {/* 本文 — 座席配置セクション */}
        <div ref={bodyRef} className='team-ovl-body'>
          <section className='team-ovl-section'>
            <SeatLayoutHeader
              seatCount={teamSeats.length}
              loading={loading}
              syncedAt={syncedAt}
              sidePadding={sidePadding}
              isEditMode={editMode.isEditMode}
              onEnterEdit={() => editMode.enterEditMode(teamSeats, teamRect)}
              onExitEdit={handleFinishEdit}
            />
            {/* ドラッグ中だけ現れるゴミ箱。落とすとドラッグ元セルを空にする */}
            <TrashDropZone
              isVisible={seatDrag.draggingCell !== null}
              isOver={seatDrag.isOverTrash}
              onDrop={() => {
                if (seatDrag.draggingCell) editMode.clearSeat(seatDrag.draggingCell)
              }}
            />
            <SeatGridFrame
              isCompactMobile={isCompactMobile}
              grid={seatGrid}
              employeeById={employeeById}
              presenceMap={presenceMap}
              teamName={teamName}
              teamColor={teamColor}
              loading={loading}
              highlightSeatId={highlightSeatId}
              onSeatClick={onSeatClick}
              onClearHighlight={onClearHighlight}
              isEditMode={editMode.isEditMode}
              isSeatSelected={seatSelection.isSeatSelected}
              isEmptyCellSelected={seatSelection.isEmptyCellSelected}
              onSelectSeat={seatSelection.selectSeat}
              onSelectEmptyCell={seatSelection.selectEmptyCell}
              seatMouseDragProps={seatDrag.seatMouseDragProps}
              cellMouseDropProps={seatDrag.cellMouseDropProps}
              seatTouchProps={seatDrag.seatTouchProps}
              editGrid={editMode.grid}
              onAddRow={editMode.addRow}
              onAddCol={editMode.addCol}
              onRemoveRow={editMode.removeRow}
              onRemoveCol={editMode.removeCol}
            />
          </section>
          {/* タッチドラッグ中だけ指へ追従するゴースト。マウスはネイティブDnDの既定画像に任せる */}
          {seatDrag.touchGhostPosition && (
            <SeatDragGhost x={seatDrag.touchGhostPosition.x} y={seatDrag.touchGhostPosition.y} />
          )}
          {/* ミニマップは座席グリッドの下。渡されなければ描かない */}
          {minimapAreas && minimapFurniture && (
            <Minimap
              areas={minimapAreas}
              furniture={minimapFurniture}
              currentArea={minimapTeamArea}
              viewBox={minimapViewBox}
              teamName={teamName}
            />
          )}
        </div>
      </div>
    </div>
  )
}
