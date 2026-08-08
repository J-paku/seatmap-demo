import { useCallback, useMemo, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { EditDialogs } from './components/EditDialogs'
import { EditModeLayer } from './components/EditModeLayer'
import { useAdminFabVisibility } from './hooks/use-admin-fab-visibility'
import { useEditDialogs } from './hooks/use-edit-dialogs'
import { useLayoutSave } from './hooks/use-layout-save'
import { useMinimapPayload } from './hooks/use-minimap-payload'
import { useObjectPlacement } from './hooks/use-object-placement'
import { useSeatAssign } from './hooks/use-seat-assign'
import { useSeatMapData } from './hooks/use-seat-map-data'
import { useTeamSeatFocus } from './hooks/use-team-seat-focus'
import type { FocusFailure } from './hooks/use-team-seat-focus'
import { AdminAddFab } from '@/components/AdminAddFab'
import { DetailPanels } from '@/components/DetailPanels'
import { EmployeeAssignSheet } from '@/components/EmployeeAssignSheet'
import { EmployeeDirectory } from '@/components/EmployeeDirectory'
import { FacilityHoverCard } from '@/components/FacilityHoverCard'
import type { FacilityHoverPayload } from '@/components/FacilityHoverCard'
import { FurniturePickerModal } from '@/components/FurniturePickerModal'
import { GhostPlacementLayer } from '@/components/GhostPlacementLayer'
import { LayoutSwitcher } from '@/components/LayoutSwitcher'
import { ObjectCategorySheet } from '@/components/ObjectCategorySheet'
import { TeamActionSheet } from '@/components/TeamActionSheet'
import { TeamCreatePopover } from '@/components/TeamCreatePopover'
import { CoachMarkTour } from '@/components/CoachMarkTour'
import { useCoachMarkTour } from '@/components/CoachMarkTour/hooks/use-coach-mark-tour'
import { ConfirmDialog } from '@/components/edit/ConfirmDialog'
import { LiveRegion } from '@/components/a11y/components/LiveRegion'
import { SeatMapCanvas } from '@/components/SeatMapCanvas'
import type { SeatMapCanvasHandle } from '@/components/SeatMapCanvas'
import { TeamOverlay } from '@/components/TeamOverlay'
import { EditErrorToast } from '@/components/edit/EditErrorToast'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useSeatLayout } from '@/lib/mock-loader'
import { useTheme } from '@/hooks/use-theme'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'
import { useLayoutEditor } from '@/hooks/use-layout-editor'
import { rectOfRef } from '@/utils/layout-objects'
import type { Rect } from '@/utils/rect'
import type { Employee, LayoutObjectRef } from '@/types'
import styles from '@/components/seatmap.module.css'

// 座席マップ画面の組み立て。データ合成・保存・ダイアログ状態はそれぞれのフックが持つ

// 座席未設定(防御分岐)の通知を出しておく時間
const NOTICE_MS = 2400

export const SeatMapView = () => {
  const { openSeatDetail, openPersonDetail, openFacilityDetail, personDetailId, closeAll } = useDetailPanel()
  const { layout } = useSeatLayout()
  const { themeMode, setTheme } = useTheme()
  // アバター編集モーダルは移植版 EmployeeDirectory が内包する(設定パネル・フッターのアバターから開く)

  // 07: 編集モード(ワーキングコピー+undoスタック+アクション発行)
  const editor = useLayoutEditor(layout)
  const { ready, employeeById, effectiveLayout, effectivePresenceMap, facilityStateById } = useSeatMapData(editor)
  // 移植版サイドバーは社員配列を直接受け取る
  const directoryEmployees = useMemo(() => [...employeeById.values()], [employeeById])
  const save = useLayoutSave(editor)
  const canvasRef = useRef<SeatMapCanvasHandle>(null)

  // 追加・削除の直後は対象の直下へ「元に戻す」チップを出す。
  // どちらも undo スタックに載るので、ドラッグ移動と同じ導線で取り消せるようにする
  const showUndoChipAt = useCallback((rect: Rect) => {
    canvasRef.current?.showUndoChipAt(rect.x + rect.w / 2, rect.y + rect.h)
  }, [])

  // 削除の実行はここに集約する。ダイアログ経由(会議室)も即時(家具)も同じ後始末を通す
  const handleDeleteObject = useCallback(
    (ref: LayoutObjectRef) => {
      const rect = effectiveLayout ? rectOfRef(effectiveLayout, ref) : null
      editor.deleteObject(ref)
      if (rect) showUndoChipAt(rect)
    },
    [editor, effectiveLayout, showUndoChipAt]
  )

  // 閲覧モードのまま置き始めた時だけ編集セッションを起こす。既に編集中なら何もしない
  // (enterEditMode はワーキングコピーと undo スタックを作り直すので、二度呼ぶと編集内容が消える)
  const ensureEditSession = useCallback(() => {
    if (!editor.isEditMode) editor.enterEditMode()
  }, [editor])

  const dialogs = useEditDialogs(editor, employeeById, { onDeleteObject: handleDeleteObject })
  const placement = useObjectPlacement(editor, {
    onPlaced: showUndoChipAt,
    onEnsureEditMode: ensureEditSession,
  })
  // 操作ガイド。編集モード初回だけ自動再生し、？ ボタンで何度でも見られる
  const centerOnSelector = useCallback((selector: string) => canvasRef.current?.centerOnSelector(selector), [])
  const tour = useCoachMarkTour({ isActive: editor.isEditMode, centerOnSelector })
  // 配属の結果はライブリージョンとトーストへ同じ文言を流す(実装を二重化しない)
  const assign = useSeatAssign({ editor, employeeById, onDone: (message) => showNotice(message) })

  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false)
  const [hoverFacility, setHoverFacility] = useState<FacilityHoverPayload | null>(null)
  // 05: 座席未設定(防御分岐)時の一時通知文言
  const [unassignedNotice, setUnassignedNotice] = useState<string | null>(null)
  // レイアウト切り替えアイランドの展開状態。開いている間は左下FABを隠す
  const [isLayoutSwitcherOpen, setIsLayoutSwitcherOpen] = useState(false)

  // 連続で通知すると、前回のタイマーが後から発火して新しい文言を消してしまう。
  // 立て続けの配属操作では毎回起きるので、出す前に前のタイマーを畳む
  const noticeTimerRef = useRef(0)
  const showNotice = useCallback((message: string) => {
    window.clearTimeout(noticeTimerRef.current)
    setUnassignedNotice(message)
    noticeTimerRef.current = window.setTimeout(() => setUnassignedNotice(null), NOTICE_MS)
  }, [])

  // 編集モードへは FAB のメニューか長押しから入る。サイドバーを開いたまま入ると
  // サイドバーの暗幕がキャンバスと編集用の操作子を覆ったままになるので先に畳む
  const handleEnterEdit = useCallback(() => {
    setIsDirectoryOpen(false)
    editor.enterEditMode()
  }, [editor, setIsDirectoryOpen])

  const handleFocusFailure = useCallback(
    (reason: FocusFailure) => {
      showNotice(reason === 'no-seat' ? '座席未設定' : '座席の所属チームが不明です')
    },
    [showNotice]
  )

  // 10: チームバウンダリのタップ、および検索・自分の席からのヒット表示を束ねる
  const focus = useTeamSeatFocus({ layout: effectiveLayout, canvasRef, onFailure: handleFocusFailure })
  // オーバーレイ内ミニマップ用のフロア情報(開いているチームが決まってから組み立てる)
  const minimap = useMinimapPayload(effectiveLayout, focus.payload?.teamId ?? null)
  // 左下 FAB の可否。条件が増えても組み立てが太らないよう判定はフックへ寄せる
  const isAdminFabVisible = useAdminFabVisibility({
    teamOverlayPayload: focus.payload,
    isDirectoryOpen,
    isPlacementActive: placement.isActive,
    assignSeatId: assign.assignSeatId,
    tour,
    isLayoutSwitcherOpen,
  })

  // サイドバーで押された社員はまずカードで見せる。座席へ飛ぶかどうかはカードのCTAが決める
  const handleDirectoryEmployeeSelect = useCallback(
    (employee: Employee) => {
      openPersonDetail(employee.id)
    },
    [openPersonDetail]
  )

  // 人物詳細を開いている社員の席。引けない社員にはCTAを出さず「座席未設定」を見せる
  const personSeat = useMemo(
    () =>
      personDetailId
        ? effectiveLayout?.seats.find((candidate) => candidate.employeeId === personDetailId) ?? null
        : null,
    [personDetailId, effectiveLayout]
  )

  // カードの「座席へ移動」。畳んでから飛ばす — 逆順だとオーバーレイの上にシートの暗幕が残る
  const handleGoToSeat = useCallback(() => {
    if (!personSeat) return
    closeAll()
    setIsDirectoryOpen(false)
    focus.focusSeat(personSeat)
  }, [personSeat, closeAll, focus, setIsDirectoryOpen])

  // 「自分の席」ボタン。検索と同じ focusSeat を通し、分岐はここ(席の引き当て)だけに持つ
  const handleGoToMySeat = useCallback(() => {
    const seat = effectiveLayout?.seats.find((candidate) => candidate.employeeId === SELF_EMPLOYEE_ID)
    if (!seat) {
      showNotice('座席未設定')
      return
    }
    focus.focusSeat(seat)
  }, [effectiveLayout, focus, showNotice])

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
      {ready && effectiveLayout && (
        <SeatMapCanvas
          ref={canvasRef}
          layout={effectiveLayout}
          employeeById={employeeById}
          presenceMap={effectivePresenceMap}
          onSeatSelect={openSeatDetail}
          onFacilitySelect={openFacilityDetail}
          onTeamBoundaryClick={focus.openByBoundary}
          facilityStateById={facilityStateById}
          onFacilityHover={setHoverFacility}
          isEditMode={editor.isEditMode}
          onSeatMove={editor.moveSeat}
          onTeamMove={editor.moveTeam}
          onTeamLabelTap={dialogs.requestTeamAction}
          onSeatAssignRequest={assign.openAssign}
          onSeatChangeTeamRequest={dialogs.requestTeamChange}
          onSeatDeleteRequest={dialogs.requestSeatDelete}
          onObjectMove={editor.moveObject}
          onObjectRepositionRequest={placement.startReposition}
          onObjectDeleteRequest={dialogs.requestObjectDelete}
          repositioningRef={placement.repositioningRef}
          onUndo={editor.undo}
          canUndo={editor.canUndo}
          onGoToMySeat={editor.isEditMode ? undefined : handleGoToMySeat}
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
        isGaroonConnected
        onGaroonLogout={() => {}}
      />
      {unassignedNotice && <div className={styles.empDirUnassignedToast}>{unassignedNotice}</div>}
      {/* 画面を見ていない人にも同じ文言を渡す。トーストと同一の文字列を使う */}
      <LiveRegion message={unassignedNotice ?? ''} />
      {save.saveToast && (
        <div className={styles.empDirUnassignedToast} role='status'>
          {save.saveToast}
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
          const facility = effectiveLayout.facilities.find((x) => x.id === hoverFacility.facilityId)
          const state = facilityStateById.get(hoverFacility.facilityId)
          return facility && state ? (
            <FacilityHoverCard
              facility={facility}
              state={state}
              empById={employeeById}
              rect={hoverFacility.rect}
            />
          ) : null
        })()}
      {!editor.isEditMode && (
        <DetailPanels
          onFacilityDeleted={(name) => showNotice(`「${name}」を削除しました`)}
          onGoToSeat={personSeat ? handleGoToSeat : undefined}
          showSeatUnsetNotice={personDetailId !== null && !personSeat}
        />
      )}

      {editor.isEditMode && (
        <EditModeLayer
          changedCount={editor.changedCount}
          isSaving={save.isSaving}
          isPlacing={placement.request !== null}
          onHelp={tour.open}
          onFinish={save.finish}
          onCancel={save.cancel}
        />
      )}

      {/* 追加導線。閲覧モードでも常設し、置き始めた時に編集セッションを起こす。
          シートとゴースト層を編集モードの内側に置くと、起動と同じフレームで描かれず1フレーム空く。
          ゴースト層はキャンバスの DOM 木の外に置く —
          中に入れると暗幕がキャンバスの pointerdown を奪い、配置中にパン/ズームできなくなる */}
      {isAdminFabVisible && (
        <AdminAddFab
          onSelectTeam={() => placement.selectCategory('team')}
          onSelectFacility={placement.openCategory}
          onEnterEdit={handleEnterEdit}
        />
      )}
      <ObjectCategorySheet
        isOpen={placement.isCategoryOpen}
        categories={['furniture', 'facility']}
        onSelect={placement.selectCategory}
        onClose={placement.cancel}
      />
      <FurniturePickerModal
        isOpen={placement.isFurniturePickerOpen}
        onSelect={placement.selectFurniture}
        onClose={placement.cancel}
      />
      <TeamCreatePopover
        isOpen={placement.isTeamFormOpen}
        onSubmit={placement.submitTeam}
        onClose={placement.cancel}
      />
      {placement.request && (
        <GhostPlacementLayer
          request={placement.request}
          placement={placement.placement}
          onConfirm={placement.confirm}
          onCancel={placement.cancel}
        />
      )}

      {editor.errorToast && <EditErrorToast key={editor.errorToast.id} message={editor.errorToast.message} />}

      {editor.isEditMode && (
        <>
          <TeamActionSheet
            isOpen={dialogs.teamActionTeamId !== null}
            teamName={dialogs.teamActionTeam?.name ?? ''}
            seatCount={dialogs.teamActionSeatCount}
            onSelect={dialogs.chooseTeamAction}
            onClose={dialogs.closeTeamAction}
          />
          <EmployeeAssignSheet
            isOpen={assign.assignSeatId !== null}
            seat={assign.assignTargetSeat}
            employees={directoryEmployees}
            seats={effectiveLayout?.seats ?? []}
            employeeById={employeeById}
            onSelect={assign.requestAssign}
            onClear={() => assign.requestAssign(null)}
            onClose={assign.closeAssign}
          />
          {assign.pendingPlan?.confirmMessage && (
            <ConfirmDialog
              ariaLabel='配属の確認'
              message={assign.pendingPlan.confirmMessage}
              confirmLabel='実行する'
              onConfirm={assign.confirmAssign}
              onCancel={assign.cancelAssign}
            />
          )}
        </>
      )}

      {editor.isEditMode && <CoachMarkTour tour={tour} />}

      <EditDialogs editor={editor} dialogs={dialogs} />

    </div>
  )
}
