import { useCallback, useMemo, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { EditDialogs } from './components/EditDialogs'
import { EditModeLayer } from './components/EditModeLayer'
import { useEditDialogs } from './hooks/use-edit-dialogs'
import { useLayoutSave } from './hooks/use-layout-save'
import { useSeatMapData } from './hooks/use-seat-map-data'
import { DetailPanels } from '@/components/DetailPanels'
import { EmployeeDirectory } from '@/components/EmployeeDirectory'
import { FacilityHoverCard } from '@/components/FacilityHoverCard'
import type { FacilityHoverPayload } from '@/components/FacilityHoverCard'
import { SeatMapCanvas } from '@/components/SeatMapCanvas'
import type { SeatMapCanvasHandle } from '@/components/SeatMapCanvas'
import { TeamOverlay } from '@/components/TeamOverlay'
import type { TeamOverlayPayload } from '@/components/TeamOverlay'
import { EditErrorToast } from '@/components/edit/EditErrorToast'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useSeatLayout } from '@/lib/mock-loader'
import { useTheme } from '@/hooks/use-theme'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'
import { useLayoutEditor } from '@/hooks/use-layout-editor'
import type { Employee, Seat } from '@/types'

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
  // 社員タップ → 該当座席へジャンプして詳細を開く(座席未設定は createVirtualSeat 由来の id 空文字)
  const handleDirectorySeatSelect = useCallback(
    (seat: Seat) => {
      setIsDirectoryOpen(false)
      if (!seat.id) {
        setUnassignedNotice('座席未設定')
        window.setTimeout(() => setUnassignedNotice(null), NOTICE_MS)
        return
      }
      canvasRef.current?.jumpToSeat(seat, () => openSeatDetail(seat.id))
    },
    [openSeatDetail]
  )
  const save = useLayoutSave(editor)
  const dialogs = useEditDialogs(editor, employeeById)

  const canvasRef = useRef<SeatMapCanvasHandle>(null)
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false)
  // 10: チームバウンダリのタップで開く大型オーバーレイ(payload=null で閉)
  const [teamOverlay, setTeamOverlay] = useState<TeamOverlayPayload | null>(null)
  const [hoverFacility, setHoverFacility] = useState<FacilityHoverPayload | null>(null)
  // 05: 座席未設定(防御分岐)時の一時通知文言
  const [unassignedNotice, setUnassignedNotice] = useState<string | null>(null)

  // 05: ディレクトリの社員選択 → 座席ジャンプ+パルス→詳細パネル(座席未設定は防御分岐)
  const handleSelectEmployee = useCallback(
    (_employee: Employee, seat: Seat | null) => {
      setIsDirectoryOpen(false)
      if (!seat) {
        // 種データは全員配置済みのため通常到達しない防御分岐
        setUnassignedNotice('座席未設定')
        window.setTimeout(() => setUnassignedNotice(null), NOTICE_MS)
        return
      }
      canvasRef.current?.jumpToSeat(seat, () => openSeatDetail(seat.id))
    },
    [openSeatDetail]
  )

  // 08: アバター編集モーダルを開く

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
          onTeamBoundaryClick={setTeamOverlay}
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
      {unassignedNotice && <div className='emp-dir-unassigned-toast'>{unassignedNotice}</div>}
      {save.saveToast && (
        <div className='emp-dir-unassigned-toast' role='status'>
          {save.saveToast}
        </div>
      )}
      {!editor.isEditMode && effectiveLayout && (
        <TeamOverlay
          payload={teamOverlay}
          seats={effectiveLayout.seats}
          employeeById={employeeById}
          presenceMap={effectivePresenceMap}
          onClose={() => setTeamOverlay(null)}
          onSeatClick={openSeatDetail}
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
      {!editor.isEditMode && <DetailPanels />}

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
