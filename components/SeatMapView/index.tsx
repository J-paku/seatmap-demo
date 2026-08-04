import { useCallback, useMemo, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { EditDialogs } from './components/EditDialogs'
import { EditModeLayer } from './components/EditModeLayer'
import { useEditDialogs } from './hooks/use-edit-dialogs'
import { useLayoutSave } from './hooks/use-layout-save'
import { useSeatMapData } from './hooks/use-seat-map-data'
import { useTeamSeatFocus } from './hooks/use-team-seat-focus'
import type { FocusFailure } from './hooks/use-team-seat-focus'
import { DetailPanels } from '@/components/DetailPanels'
import { EmployeeDirectory } from '@/components/EmployeeDirectory'
import { FacilityHoverCard } from '@/components/FacilityHoverCard'
import type { FacilityHoverPayload } from '@/components/FacilityHoverCard'
import { MySeatButton } from '@/components/MySeatButton'
import { SeatMapCanvas } from '@/components/SeatMapCanvas'
import type { SeatMapCanvasHandle } from '@/components/SeatMapCanvas'
import { TeamOverlay } from '@/components/TeamOverlay'
import { EditErrorToast } from '@/components/edit/EditErrorToast'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useSeatLayout } from '@/lib/mock-loader'
import { useTheme } from '@/hooks/use-theme'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'
import { useLayoutEditor } from '@/hooks/use-layout-editor'
import type { Seat } from '@/types'

// 座席マップ画面の組み立て。データ合成・保存・ダイアログ状態はそれぞれのフックが持つ

// 座席未設定(防御分岐)の通知を出しておく時間
const NOTICE_MS = 2400

export const SeatMapView = () => {
  const { openSeatDetail, openFacilityDetail } = useDetailPanel()
  const { layout } = useSeatLayout()
  const { themeMode, setTheme } = useTheme()
  // アバター編集モーダルは移植版 EmployeeDirectory が内包する(設定パネル・フッターのアバターから開く)

  // 07: 編集モード(ワーキングコピー+undoスタック+アクション発行)
  const editor = useLayoutEditor(layout)
  const { ready, employeeById, effectiveLayout, effectivePresenceMap, facilityStateById } = useSeatMapData(editor)
  // 移植版サイドバーは社員配列を直接受け取る
  const directoryEmployees = useMemo(() => [...employeeById.values()], [employeeById])
  const save = useLayoutSave(editor)
  const dialogs = useEditDialogs(editor, employeeById)

  const canvasRef = useRef<SeatMapCanvasHandle>(null)
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false)
  const [hoverFacility, setHoverFacility] = useState<FacilityHoverPayload | null>(null)
  // 05: 座席未設定(防御分岐)時の一時通知文言
  const [unassignedNotice, setUnassignedNotice] = useState<string | null>(null)

  const showNotice = useCallback((message: string) => {
    setUnassignedNotice(message)
    window.setTimeout(() => setUnassignedNotice(null), NOTICE_MS)
  }, [])

  const handleFocusFailure = useCallback(
    (reason: FocusFailure) => {
      showNotice(reason === 'no-seat' ? '座席未設定' : '座席の所属チームが不明です')
    },
    [showNotice]
  )

  // 10: チームバウンダリのタップ、および検索・自分の席からのヒット表示を束ねる
  const focus = useTeamSeatFocus({ layout: effectiveLayout, canvasRef, onFailure: handleFocusFailure })

  // 検索でヒットした社員の席 → 所属チームのオーバーレイを開き、その席をヒット表示する。
  // キャンバス側に座席カードは無いので、旧来の座席へのズームは行わない
  const handleDirectorySeatSelect = useCallback(
    (seat: Seat) => {
      setIsDirectoryOpen(false)
      focus.focusSeat(seat)
    },
    [focus]
  )

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
    <div className='seat-map-page'>
      {!editor.isEditMode && (
        <AppHeader
          onOpenDirectory={() => setIsDirectoryOpen(true)}
          isDirectoryOpen={isDirectoryOpen}
        />
      )}
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
          onTeamLabelTap={dialogs.requestRelayout}
          onSeatChangeTeamRequest={dialogs.requestTeamChange}
          onSeatDeleteRequest={dialogs.requestSeatDelete}
          onUndo={editor.undo}
          canUndo={editor.canUndo}
        />
      )}
      <EmployeeDirectory
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        employees={directoryEmployees}
        seats={effectiveLayout?.seats ?? []}
        currentUserId={SELF_EMPLOYEE_ID}
        onSeatSelect={handleDirectorySeatSelect}
        themeMode={themeMode}
        setTheme={setTheme}
        onEnterEdit={editor.enterEditMode}
        onResetLayout={save.resetLayout}
        onRefresh={() => {}}
        isGaroonConnected
        onGaroonLogout={() => {}}
      />
      {/* 編集モードでは TeamOverlay 自体が描画されないため、この入口も出さない */}
      {!editor.isEditMode && ready && effectiveLayout && <MySeatButton onClick={handleGoToMySeat} />}
      {unassignedNotice && <div className='emp-dir-unassigned-toast'>{unassignedNotice}</div>}
      {save.saveToast && (
        <div className='emp-dir-unassigned-toast' role='status'>
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
        <DetailPanels onFacilityDeleted={(name) => showNotice(`「${name}」を削除しました`)} />
      )}

      {editor.isEditMode && (
        <EditModeLayer
          changedCount={editor.changedCount}
          isSaving={save.isSaving}
          onFinish={save.finish}
          onCancel={save.cancel}
        />
      )}

      {editor.errorToast && <EditErrorToast key={editor.errorToast.id} message={editor.errorToast.message} />}

      <EditDialogs editor={editor} dialogs={dialogs} />

    </div>
  )
}
