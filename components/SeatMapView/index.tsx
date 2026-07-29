import { useCallback, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { EditDialogs } from './components/EditDialogs'
import { EditModeLayer } from './components/EditModeLayer'
import { useEditDialogs } from './hooks/use-edit-dialogs'
import { useLayoutSave } from './hooks/use-layout-save'
import { useSeatMapData } from './hooks/use-seat-map-data'
import { AvatarCustomizer } from '@/components/AvatarCustomizer'
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
import { useSelfAvatar } from '@/contexts/self-avatar-context'
import { useLayoutEditor } from '@/hooks/use-layout-editor'
import type { Employee, Seat } from '@/types'

// 座席マップ画面の組み立て。データ合成・保存・ダイアログ状態はそれぞれのフックが持つ

// 座席未設定(防御分岐)の通知を出しておく時間
const NOTICE_MS = 2400

export const SeatMapView = () => {
  const { openSeatDetail, openFacilityDetail } = useDetailPanel()
  const { layout } = useSeatLayout()
  const { selfAvatar, openEditor } = useSelfAvatar()

  // 07: 編集モード(ワーキングコピー+undoスタック+アクション発行)
  const editor = useLayoutEditor(layout)
  const { ready, employeeById, effectiveLayout, effectivePresenceMap, facilityStateById } = useSeatMapData(editor)
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
  const handleOpenAvatarEditor = useCallback(() => openEditor(), [openEditor])

  return (
    <div className='seat-map-page'>
      {!editor.isEditMode && (
        <AppHeader
          selfAvatar={selfAvatar}
          onOpenDirectory={() => setIsDirectoryOpen(true)}
          onResetLayout={save.resetLayout}
          onEnterEdit={editor.enterEditMode}
          onOpenAvatarEditor={handleOpenAvatarEditor}
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
        onSelectEmployee={handleSelectEmployee}
        onOpenAvatarEditor={handleOpenAvatarEditor}
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

      {/* 08: アバター編集モーダル(開いている時のみマウント) */}
      <AvatarCustomizer />
    </div>
  )
}
