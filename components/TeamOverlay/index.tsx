import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import type { GridCell } from '@/utils/seat-grid-draft'
import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH } from '@/utils/seat-relayout'

// 10: チームバウンダリクリックで開く大型オーバーレイ(座席グリッド全体)
// クリックしたバウンダリ中心から膨らむように開く。中央固定拡大ではない
// 幅 760px を境に、シェル形状・座席グリッド・入力モデルがまるごと切り替わる

// STEP B5: 追加直後の席をハイライト(選択状態を流用)しておく時間。この間に別のセル/席を
// 選択し直した場合はハイライトを奪わない(下のuseEffectがisSeatSelectedの変化で再評価する)
const SEAT_ADD_HIGHLIGHT_MS = 1800

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

  // STEP B2/B3: 編集中セルのドラッグ移動/入替とゴミ箱への削除。moveSeat/removeSeatAtCellは
  // どちらもuseOverlayEditModeが持つ唯一のgrid差分適用口をそのまま渡す
  const seatDrag = useSeatDrag({ moveSeat: editMode.moveSeat, removeSeatAtCell: editMode.removeSeatAtCell })

  // STEP B5: 空セルからの席追加。仮IDの採番はuseSeatDraftState.addSeatに一本化し、ここでは
  // 採番しない。置いた直後は選択状態(既存のis-selected見せ方)をハイライト代わりに流用する
  const [justAddedSeatId, setJustAddedSeatId] = useState<string | null>(null)

  // useEffect/useCallbackの依存配列にメンバー式(seatSelection.xxx)をそのまま書くとlintが
  // 親オブジェクト自体の追跡を求めてくるため、使う関数だけ先に取り出しておく
  const { selectSeat, selectEmptyCell, isSeatSelected, isEmptyCellSelected, clearSelection } = seatSelection

  // STEP B5: 空セルの再タップで選択解除できるようにする。selectEmptyCell自体は「常にそのセルを
  // 選ぶ」だけでトグルではないため、既に選択中のセルを再度渡された時だけここでclearSelectionへ
  // 差し替える(SeatActionOverlayのコンテナがpointer-events:noneで背後のEmptyGridCellへタップを
  // 素通しする設計と対になる箇所)
  const handleSelectEmptyCell = useCallback(
    (cell: GridCell) => {
      if (isEmptyCellSelected(cell)) {
        clearSelection()
        return
      }
      selectEmptyCell(cell)
    },
    [isEmptyCellSelected, clearSelection, selectEmptyCell]
  )

  const handleAddSeat = useCallback(
    (cell: GridCell) => {
      if (!payload) return
      // x/y はグリッドセルの位置がそのまま採用され、保存(commit)時にセル位置から座標を
      // 直列化し直すため、ここでの値は使われない(0で安全)
      const newSeat = editMode.draft.addSeat({
        teamId: payload.teamId,
        x: 0,
        y: 0,
        width: DEFAULT_SEAT_WIDTH,
        height: DEFAULT_SEAT_HEIGHT,
        rotation: 0,
        employeeId: null,
      })
      editMode.placeSeat(cell, newSeat.id)
      selectSeat(newSeat.id)
      setJustAddedSeatId(newSeat.id)
    },
    [payload, editMode, selectSeat]
  )

  // 追加直後の席を一定時間だけハイライトし続け、その間に選択が変わらなければ自動で消す。
  // isSeatSelectedはselectionが変わるたびに参照が変わるため、途中で別のセル/席が選択されたら
  // このeffectが再評価されタイマーを張り直さない(他人の選択を誤って消さないための唯一の判定)
  useEffect(() => {
    if (!justAddedSeatId || !isSeatSelected(justAddedSeatId)) return
    if (isCompactMobile) {
      const target = bodyRef.current?.querySelector<HTMLElement>(`[data-seat-id="${justAddedSeatId}"]`)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' })
    }
    const timer = window.setTimeout(() => {
      clearSelection()
      setJustAddedSeatId(null)
    }, SEAT_ADD_HIGHLIGHT_MS)
    return () => window.clearTimeout(timer)
  }, [justAddedSeatId, isCompactMobile, isSeatSelected, clearSelection])

  // STEP A5: 保存(commit)の呼び口。保存ボタン付きの編集ドックは PHASE D の担当なので、
  // ここでは「終了」から保存できるところまでを配線する
  const seatCommit = useSeatCommit({
    teamId: payload?.teamId ?? null,
    grid: editMode.grid,
    draft: editMode.draft,
    isGridChanged: editMode.isGridChanged,
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
            {/* ドラッグ中だけ現れるゴミ箱。落とすとドラッグ元の席を削除する */}
            <TrashDropZone
              isVisible={seatDrag.draggingCell !== null}
              isOver={seatDrag.isOverTrash}
              onDrop={() => {
                if (seatDrag.draggingCell) editMode.removeSeatAtCell(seatDrag.draggingCell)
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
              onSelectEmptyCell={handleSelectEmptyCell}
              seatMouseDragProps={seatDrag.seatMouseDragProps}
              cellMouseDropProps={seatDrag.cellMouseDropProps}
              seatTouchProps={seatDrag.seatTouchProps}
              editGrid={editMode.grid}
              onAddRow={editMode.addRow}
              onAddCol={editMode.addCol}
              onRemoveRow={editMode.removeRow}
              onRemoveCol={editMode.removeCol}
              onAddSeat={handleAddSeat}
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
