import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditDock } from './components/EditDock'
import { Minimap } from './components/Minimap'
import { SeatDragGhost } from './components/SeatDragGhost'
import { SeatGridFrame } from './components/SeatGridFrame'
import { SeatLayoutHeader } from './components/SeatLayoutHeader'
import { TeamOverlayHeader } from './components/TeamOverlayHeader'
import { TrashDropZone } from './components/TrashDropZone'
import { useBulkAssign } from './hooks/use-bulk-assign'
import { useIsCompactMobile } from './hooks/use-compact-mobile'
import { useDraftAppliedSeats } from './hooks/use-draft-applied-seats'
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
import { useGlobalAnnouncement } from '@/components/a11y'
import { ConfirmDialog } from '@/components/edit/ConfirmDialog'
import { EmployeeAssignSheet } from '@/components/EmployeeAssignSheet'
import { SeatMapPortal } from '@/components/SeatMapPortal'
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
  // STEP D3: 編集の開始・保存・キャンセル・一括配置の結果はここから唯一のLiveRegion(a11y全体で
  // 共有するAnnouncementProvider)へ流す。TeamOverlay専用のLiveRegionは新設しない
  const { announce } = useGlobalAnnouncement()

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

  // STEP C1: 席の再タップで選択解除できるようにする。selectSeat自体は「常にその席を選ぶ」だけで
  // トグルではないため、空セル側(handleSelectEmptyCell)と同じ方針でここに差し替える
  const handleSelectSeat = useCallback(
    (seatId: string) => {
      if (isSeatSelected(seatId)) {
        clearSelection()
        return
      }
      selectSeat(seatId)
    },
    [isSeatSelected, clearSelection, selectSeat]
  )

  // STEP C2: 社員検索シートはキャンバス編集(SeatMapView)と同じ EmployeeAssignSheet をそのまま使う。
  // 確定先だけこちらは assignmentsOverride(draft.assignEmployee)へ差し替え、localStorage への保存は
  // 一切行わない(保存は EditDock の保存ボタン → seatCommit.commit のみが担う。STEP D3)
  const [assignSeatId, setAssignSeatId] = useState<string | null>(null)

  // 対象席は seatGrid(差分反映済み)から引く。判定基準を二重に持たないため、下書き追加席・
  // 割当上書きの解決は use-seat-layout-compose 側の1本にそのまま委ねる
  const assignTargetSeat = useMemo(
    () => seatGrid.positionedSeats.find((p) => p.seat.id === assignSeatId)?.seat ?? null,
    [seatGrid, assignSeatId]
  )

  // 検索対象は組織全員。employeeById は SeatMapView から渡ってくる同じ Map をそのまま使う
  const assignEmployees = useMemo(() => [...employeeById.values()], [employeeById])

  // STEP C4: 検索シート・一括配置へ渡す「全座席」は下書き反映済みのものに統一する。base(seats)の
  // ままだと同一セッション内の配属がシートから見えず、「今どこに座っているか」の判定が保存済みの
  // 席を指し続けて同じ人を複数席へ重複配置できてしまう。判定基準を二重に持たないよう、
  // 一括配置(useBulkAssign)側にも同じ配列を渡す
  const draftAppliedSeats = useDraftAppliedSeats(seats, editMode.draft)

  const handleAssignSeat = useCallback((seatId: string) => setAssignSeatId(seatId), [])

  const handleAssignSelect = useCallback(
    (employeeId: string) => {
      if (assignSeatId) editMode.draft.assignEmployee(assignSeatId, employeeId)
      setAssignSeatId(null)
    },
    [assignSeatId, editMode]
  )

  const handleAssignClear = useCallback(() => {
    if (assignSeatId) editMode.draft.assignEmployee(assignSeatId, null)
    setAssignSeatId(null)
  }, [assignSeatId, editMode])

  const handleAssignClose = useCallback(() => setAssignSeatId(null), [])

  // STEP C3: 部署ごとの一括配置。EmployeeAssignSheetの「この部署をまとめて配属」から呼ぶ。
  // 対象は draftAppliedSeats(下書き反映済みの全座席)から引くため、選択中の特定席とは独立に
  // 部署全員を空セルへ詰めていく
  const bulkAssign = useBulkAssign({
    teamId: payload?.teamId ?? null,
    employees: assignEmployees,
    seats: draftAppliedSeats,
    grid: editMode.grid,
    draft: editMode.draft,
    addRow: editMode.addRow,
    placeSeat: editMode.placeSeat,
    announce,
  })

  // シートを閉じてから一括配置を要求する。移動確認が要れば ConfirmDialog 側で続きを引き継ぐ
  const handleBulkAssignRequest = useCallback(() => {
    setAssignSeatId(null)
    bulkAssign.requestBulkAssign()
  }, [bulkAssign])

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

  // STEP A5→D3: 保存(commit)の呼び口。呼び出すのは編集ドック(EditDock)の保存ボタンだけにする
  const seatCommit = useSeatCommit({
    teamId: payload?.teamId ?? null,
    grid: editMode.grid,
    draft: editMode.draft,
    isGridChanged: editMode.isGridChanged,
  })

  // STEP D3: 保存経路はこの1本だけにする(ヘッダー「終了」はもうcommitを兼ねない)。
  // 保存後はeditMode.cancelで編集モードを抜ける — 抜けずに居続けると、既に確定済みの
  // draft.addedSeats/gridがそのまま残り、再度保存を押した時に同じ席を二重追加してしまうため。
  // isSaving中の二重押下はここで弾く
  const handleSaveEdit = useCallback(() => {
    if (seatCommit.isSaving) return
    void seatCommit.commit().then(() => {
      editMode.cancel()
      announce('[success]座席配置を保存しました')
    })
  }, [seatCommit, editMode, announce])

  // 取消(破棄)。ドックのキャンセルボタンとヘッダーの「終了」ボタンの両方から呼ぶ唯一の経路。
  // editMode.cancelは既に確定保存された内容までは打ち消さない(grid/draft/isEditModeの後始末のみ)ため、
  // 確認は挟まない
  const handleCancelEdit = useCallback(() => {
    editMode.cancel()
    announce('[info]編集をキャンセルしました')
  }, [editMode, announce])

  // 編集中は✕・背景・Escで閉じられないようにする(未保存の変更を無言で捨てない)。
  // 編集モードを抜けられるのは SeatLayoutHeader の「終了」と EditDock のキャンセル・保存
  // (いずれも editMode.cancel を最終的に通す)だけにする。STEP D3
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
  // STEP D3: 編集ドックの保存可否。changeCountだけ見ると、行・列の増減や席の移動(gridにしか
  // 現れずchangeCountでは1件も数えない)をした時に保存できない不具合が起きるため、
  // seatCommit.commitの内部ゲートと同じ2値(draft.changeCount / editMode.isGridChanged)を見る
  const hasEditChanges = editMode.draft.changeCount > 0 || editMode.isGridChanged

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
              isSaving={seatCommit.isSaving}
              onEnterEdit={() => {
                editMode.enterEditMode(teamSeats, teamRect)
                announce('[info]座席編集を開始しました')
              }}
              onExitEdit={handleCancelEdit}
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
              onSelectSeat={handleSelectSeat}
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
              onAssignSeat={handleAssignSeat}
              onRotateSeat={editMode.draft.rotateSeat}
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
        {/* STEP D3: 保存/キャンセルの編集ドック。.team-ovl-panel(position: relative)基準の
            絶対配置で下部に浮かせるだけなので、TrashDropZoneと違いSeatMapPortalへは逃がさない
            (viewport基準のfixed位置決めが要らないため) */}
        {editMode.isEditMode && (
          <EditDock
            changeCount={editMode.draft.changeCount}
            hasChanges={hasEditChanges}
            isSaving={seatCommit.isSaving}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}
      </div>
      {/* STEP C2: .team-ovl-panel は backdrop-filter + overflow:hidden で fixed 子を閉じ込めるため、
          TrashDropZone と同じ理由で SeatMapPortal 経由で body 直下へ描く */}
      <SeatMapPortal>
        <EmployeeAssignSheet
          isOpen={assignSeatId !== null}
          seat={assignTargetSeat}
          employees={assignEmployees}
          seats={draftAppliedSeats}
          employeeById={employeeById}
          onSelect={handleAssignSelect}
          onClear={handleAssignClear}
          onClose={handleAssignClose}
          onBulkAssign={handleBulkAssignRequest}
        />
        {/* STEP C3: 他所配属者(movers)がいる時だけ出す移動確認。newcomers だけなら確認を挟まない */}
        {bulkAssign.pendingPlan?.confirmMessage && (
          <ConfirmDialog
            ariaLabel='部署一括配置の確認'
            message={bulkAssign.pendingPlan.confirmMessage}
            confirmLabel='実行する'
            onConfirm={bulkAssign.confirmBulkAssign}
            onCancel={bulkAssign.cancelBulkAssign}
          />
        )}
      </SeatMapPortal>
    </div>
  )
}
