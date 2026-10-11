import { AppHeader } from './components/AppHeader'
import { EditDialogs } from './components/EditDialogs'
import { EditModeLayer } from './components/EditModeLayer'
import { PlacementSheets } from './components/PlacementSheets'
import { SeatAssignDialogs } from './components/SeatAssignDialogs'
import { useAdminFabVisibility } from './hooks/use-admin-fab-visibility'
import { useCanvasHandle } from './hooks/use-canvas-handle'
import { useEditDialogs } from './hooks/use-edit-dialogs'
import { useEditSessionEnd } from './hooks/use-edit-session-end'
import { useEditSessionStart } from './hooks/use-edit-session-start'
import { useGhostDelete } from './hooks/use-ghost-delete'
import { useLayoutSave } from './hooks/use-layout-save'
import { useMinimapPayload } from './hooks/use-minimap-payload'
import { useObjectDelete } from './hooks/use-object-delete'
import { useObjectPlacement } from './hooks/use-object-placement'
import { usePlacementEntries } from './hooks/use-placement-entries'
import { useSeatAssign } from './hooks/use-seat-assign'
import { useSeatBulkActions } from './hooks/use-seat-bulk-actions'
import { useSeatMapData } from './hooks/use-seat-map-data'
import { useSeatMapTours } from './hooks/use-seat-map-tours'
import { useSeatNavigation } from './hooks/use-seat-navigation'
import { useSurfaceState } from './hooks/use-surface-state'
import { useTransientNotice } from './hooks/use-transient-notice'
import { facilityDeletedMessage } from './utils/compose-notice-message'
import { findHoverFacility } from './utils/find-hover-facility'
import { AdminAddFab } from '@/components/AdminAddFab'
import { DetailPanels } from '@/components/DetailPanels'
import { EmployeeDirectory } from '@/components/EmployeeDirectory'
import { FacilityHoverCard } from '@/components/FacilityHoverCard'
import { GuideButton } from '@/components/GuideButton'
import { LayoutSwitcher } from '@/components/LayoutSwitcher'
import { CoachMarkTour } from '@/components/CoachMarkTour'
import { LiveRegion } from '@/components/a11y/components/LiveRegion'
import { SeatMapCanvas } from '@/components/SeatMapCanvas'
import { TeamOverlay } from '@/components/TeamOverlay'
import { EditErrorToast } from '@/components/edit/EditErrorToast'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useSeatLayout } from '@/hooks/use-mock-data'
import { useTheme } from '@/hooks/use-theme'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'
import { TOAST_MESSAGES } from '@/utils/toast-messages'
import { useLayoutEditor } from '@/hooks/use-layout-editor/use-layout-editor'
import styles from '@/components/seatmap.module.css'

// 座席マップ画面の組み立て。データ合成・保存・ダイアログ状態・操作ガイドはそれぞれのフックが持ち、
// ここは配線と面の並べ方だけを持つ

export const SeatMapView = () => {
  const { openSeatDetail, openFacilityDetail, personDetailId } = useDetailPanel()
  const { layout } = useSeatLayout()
  const { themeMode, setTheme } = useTheme()
  // アバター編集モーダルは移植版 EmployeeDirectory が内包する(設定パネル・フッターのアバターから開く)

  // 07: 編集モード(ワーキングコピー+undoスタック+アクション発行)
  const editor = useLayoutEditor(layout)
  // 05: 座席未設定(防御分岐)などの一時通知
  const { notice: unassignedNotice, showNotice } = useTransientNotice()
  const data = useSeatMapData(editor)
  const {
    ready,
    employeeById,
    directoryEmployees,
    effectiveLayout,
    placedFacilityIds,
    effectivePresenceMap,
    facilityStateById,
  } = data
  const save = useLayoutSave(editor)
  const { canvasRef, showUndoChipAt, handlePlaced, centerOnSelector } = useCanvasHandle()
  const ensureEditSession = useEditSessionStart(editor)
  const placement = useObjectPlacement(editor, {
    onPlaced: handlePlaced,
    onEnsureEditMode: ensureEditSession,
  })
  const handleDeleteObject = useObjectDelete({ editor, effectiveLayout, showUndoChipAt, placement })
  const dialogs = useEditDialogs(editor, employeeById, { onDeleteObject: handleDeleteObject })
  const { handleSeatEnlarge, bulkDeleteSeatIds, setBulkDeleteSeatIds, confirmBulkDelete } =
    useSeatBulkActions(editor)
  const { handleSessionCancel, handleSessionFinish } = useEditSessionEnd(placement, save)
  const { isGhostDeletable, isGhostDeleting, handleGhostDelete } = useGhostDelete(
    placement,
    dialogs
  )
  // 操作ガイド4本(編集・メイン・チーム・家具)の活性化はフックへ寄せる。
  // 出し分けが画面の組み立てに散ると「どのガイドがいつ出るか」が読めなくなる
  const tours = useSeatMapTours({
    isEditMode: editor.isEditMode,
    centerOnSelector,
    placementTargetType: placement.request?.target.type,
  })
  const { handleTeamTap, handleSelectTeam, handleSelectFacility } = usePlacementEntries(
    placement,
    tours
  )
  // 配属の結果はライブリージョンとトーストへ同じ文言を流す(実装を二重化しない)
  const assign = useSeatAssign({ editor, employeeById, onDone: message => showNotice(message) })
  const surface = useSurfaceState()
  const {
    isDirectoryOpen,
    setIsDirectoryOpen,
    hoverFacility,
    setHoverFacility,
    isLayoutSwitcherOpen,
    setIsLayoutSwitcherOpen,
    selectedSeatCount,
    setSelectedSeatCount,
  } = surface
  const nav = useSeatNavigation({ effectiveLayout, canvasRef, showNotice, surface })
  const { focus, personSeat, handleDirectoryEmployeeSelect, handleGoToSeat, handleGoToMySeat } = nav
  // オーバーレイ内ミニマップ用のフロア情報(開いているチームが決まってから組み立てる)
  const minimap = useMinimapPayload(effectiveLayout, focus.payload?.teamId ?? null)
  // 左下 FAB の可否。条件が増えても組み立てが太らないよう判定はフックへ寄せる
  const isAdminFabVisible = useAdminFabVisibility({
    teamOverlayPayload: focus.payload,
    isDirectoryOpen,
    isPlacementActive: placement.isActive,
    assignSeatId: assign.assignSeatId,
    tours: tours.tours,
    // 閲覧モードでは常に0として扱う二重の保険
    selectedSeatCount: editor.isEditMode ? selectedSeatCount : 0,
    isLayoutSwitcherOpen,
  })

  return (
    <div className={styles.seatMapPage}>
      {!editor.isEditMode && (
        <AppHeader
          onOpenDirectory={() => setIsDirectoryOpen(true)}
          isDirectoryOpen={isDirectoryOpen}
        />
      )}
      {/* 編集中は土台(公式/カスタム)を差し替えさせない。差し替えるとワーキングコピーが宙に浮く */}
      {!editor.isEditMode && <LayoutSwitcher onExpandedChange={setIsLayoutSwitcherOpen} />}
      {/* 使い方ガイドの入口。アイランドと同じ行に並べたいので、ヘッダーではなくここで描く */}
      {!editor.isEditMode && (
        <GuideButton
          ariaLabel='使い方ガイド'
          onClick={tours.replayMainTour}
          className={styles.mapGuideButton}
        />
      )}
      {ready && effectiveLayout && (
        <SeatMapCanvas
          ref={canvasRef}
          layout={effectiveLayout}
          employeeById={employeeById}
          onSeatSelect={openSeatDetail}
          onFacilitySelect={openFacilityDetail}
          onTeamBoundaryClick={focus.openByBoundary}
          facilityStateById={facilityStateById}
          onFacilityHover={setHoverFacility}
          isEditMode={editor.isEditMode}
          onTeamTap={handleTeamTap}
          onSeatSelectionChange={setSelectedSeatCount}
          onSeatAssignRequest={assign.openAssign}
          onSeatDeleteRequest={dialogs.requestSeatDelete}
          onSeatRotateRequest={editor.rotateSeats}
          onSeatShapeRequest={handleSeatEnlarge}
          onSeatBulkDeleteRequest={setBulkDeleteSeatIds}
          onEndSession={placement.isActive ? undefined : save.cancel}
          onObjectRepositionRequest={placement.startReposition}
          onObjectDeleteRequest={dialogs.requestObjectDelete}
          onObjectLockToggle={editor.setObjectLocked}
          onObjectLabelToggle={editor.setObjectLabelVisible}
          repositioningRef={placement.repositioningRef}
          onUndo={editor.undo}
          canUndo={editor.canUndo}
          onGoToMySeat={editor.isEditMode ? undefined : handleGoToMySeat}
          onEnterEditSession={editor.isEditMode ? undefined : ensureEditSession}
        />
      )}
      <EmployeeDirectory
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        employees={directoryEmployees}
        currentUserId={SELF_EMPLOYEE_ID}
        onEmployeeSelect={handleDirectoryEmployeeSelect}
        themeMode={themeMode}
        setTheme={setTheme}
        onResetLayout={save.resetLayout}
        onRefresh={() => {}}
        onGaroonLogout={() => {}}
      />
      {unassignedNotice && <div className={styles.empDirUnassignedToast}>{unassignedNotice}</div>}
      {/* 画面を見ていない人にも同じ文言を渡す。トーストと同一の文字列を使う */}
      <LiveRegion message={unassignedNotice ?? ''} />
      {/* 05-6: 保存成功トーストは画面中央・5秒・「元に戻す」つき。座席未設定通知(下部固定)とは
          位置が違うので別クラスを使う */}
      {save.saveToast && (
        <div className={styles.saveToast} role='status'>
          {save.saveToast}
          {save.canUndoSave && (
            <button type='button' className={styles.saveToastUndo} onClick={save.undoSave}>
              {TOAST_MESSAGES.UNDO_ACTION}
            </button>
          )}
        </div>
      )}
      {!editor.isEditMode && effectiveLayout && (
        <TeamOverlay
          payload={focus.payload}
          seats={effectiveLayout.seats}
          employeeById={employeeById}
          presenceMap={effectivePresenceMap}
          onClose={focus.close}
          onSeatClick={openSeatDetail}
          highlightSeatId={focus.highlightSeatId}
          onClearHighlight={focus.clearHighlight}
          minimapAreas={minimap?.areas}
          minimapFurniture={minimap?.furniture}
          minimapTeamArea={minimap?.currentArea}
          minimapViewBox={minimap?.viewBox}
        />
      )}
      {!editor.isEditMode &&
        hoverFacility &&
        effectiveLayout &&
        (() => {
          const found = findHoverFacility(
            effectiveLayout.facilities,
            facilityStateById,
            hoverFacility.facilityId
          )
          return found ? (
            <FacilityHoverCard
              facility={found.facility}
              state={found.state}
              empById={employeeById}
              rect={hoverFacility.rect}
            />
          ) : null
        })()}
      {!editor.isEditMode && (
        <DetailPanels
          onFacilityDeleted={name => showNotice(facilityDeletedMessage(name))}
          onGoToSeat={personSeat ? handleGoToSeat : undefined}
          showSeatUnsetNotice={personDetailId !== null && !personSeat}
        />
      )}

      {editor.isEditMode && (
        <EditModeLayer
          changedCount={editor.changedCount}
          isSaving={save.isSaving}
          isPlacing={placement.request !== null}
          onHelp={tours.handleHelp}
          onFinish={handleSessionFinish}
          onCancel={handleSessionCancel}
        />
      )}

      {/* 追加導線。閲覧モードでも常設し、置き始めた時に編集セッションを起こす。
          シートとゴースト層を編集モードの内側に置くと、起動と同じフレームで描かれず1フレーム空く。
          ゴースト層はキャンバスの DOM 木の外に置く —
          中に入れると暗幕がキャンバスの pointerdown を奪い、配置中にパン/ズームできなくなる */}
      {isAdminFabVisible && (
        <AdminAddFab
          onSelectTeam={handleSelectTeam}
          onSelectFacility={handleSelectFacility}
          onEditLayout={ensureEditSession}
        />
      )}
      <PlacementSheets
        placement={placement}
        placedFacilityIds={placedFacilityIds}
        isGhostDeleting={isGhostDeleting}
        onGhostDelete={isGhostDeletable ? handleGhostDelete : undefined}
      />

      {editor.errorToast && (
        <EditErrorToast key={editor.errorToast.id} message={editor.errorToast.message} />
      )}

      {editor.isEditMode && (
        <SeatAssignDialogs
          assign={assign}
          employees={directoryEmployees}
          seats={effectiveLayout?.seats ?? []}
          employeeById={employeeById}
          bulkDeleteSeatIds={bulkDeleteSeatIds}
          onConfirmBulkDelete={confirmBulkDelete}
          onCancelBulkDelete={() => setBulkDeleteSeatIds(null)}
        />
      )}

      {/* 暗幕が2枚重なると操作不能になる。フロー導線のガイドが再生中は編集/メインの層を描かない */}
      {editor.isEditMode && !tours.isFlowTourPlaying && <CoachMarkTour tour={tours.editTour} />}
      {!editor.isEditMode && !tours.isFlowTourPlaying && <CoachMarkTour tour={tours.mainTour} />}
      {/* §05-7: この2つは常時マウントする。FAB はセッションの外で押され、
          選択と同じフレームで ensureEditSession が isEditMode を立てるので、
          isEditMode ガードを掛けると初回の自動再生とタイミングがずれる */}
      <CoachMarkTour tour={tours.teamTour} />
      <CoachMarkTour tour={tours.furnitureTour} />

      <EditDialogs editor={editor} dialogs={dialogs} />
    </div>
  )
}
