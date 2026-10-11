import { DirectorySidebar } from './components/DirectorySidebar'
import { EditDialogs } from './components/EditDialogs'
import { EditSurfaces } from './components/EditSurfaces'
import { MapCanvas } from './components/MapCanvas'
import { NoticeToasts } from './components/NoticeToasts'
import { TourLayers } from './components/TourLayers'
import { ViewModeHeader } from './components/ViewModeHeader'
import { ViewModePanels } from './components/ViewModePanels'
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
import { useSeatLayout } from '@/hooks/use-mock-data'
import { useTheme } from '@/hooks/use-theme'
import { useLayoutEditor } from '@/hooks/use-layout-editor/use-layout-editor'
import styles from '@/components/seatmap.module.css'

// 座席マップ画面の組み立て。データ合成・保存・ダイアログ状態・操作ガイドはそれぞれのフックが持ち、
// ここは配線と面の並べ方だけを持つ

export const SeatMapView = () => {
  const { layout } = useSeatLayout()
  const theme = useTheme()
  // 07: 編集モード(ワーキングコピー+undoスタック+アクション発行)
  const editor = useLayoutEditor(layout)
  // 05: 座席未設定(防御分岐)などの一時通知
  const { notice: unassignedNotice, showNotice } = useTransientNotice()
  const data = useSeatMapData(editor)
  const { ready, employeeById, effectiveLayout } = data
  const save = useLayoutSave(editor)
  const { canvasRef, showUndoChipAt, handlePlaced, centerOnSelector } = useCanvasHandle()
  const ensureEditSession = useEditSessionStart(editor)
  const placement = useObjectPlacement(editor, {
    onPlaced: handlePlaced,
    onEnsureEditMode: ensureEditSession,
  })
  const handleDeleteObject = useObjectDelete({ editor, effectiveLayout, showUndoChipAt, placement })
  const dialogs = useEditDialogs(editor, employeeById, { onDeleteObject: handleDeleteObject })
  const seatBulk = useSeatBulkActions(editor)
  const sessionEnd = useEditSessionEnd(placement, save)
  const ghostDelete = useGhostDelete(placement, dialogs)
  // 操作ガイド4本(編集・メイン・チーム・家具)の活性化はフックへ寄せる。
  // 出し分けが画面の組み立てに散ると「どのガイドがいつ出るか」が読めなくなる
  const tours = useSeatMapTours({
    isEditMode: editor.isEditMode,
    centerOnSelector,
    placementTargetType: placement.request?.target.type,
  })
  const entries = usePlacementEntries(placement, tours)
  // 配属の結果はライブリージョンとトーストへ同じ文言を流す(実装を二重化しない)
  const assign = useSeatAssign({ editor, employeeById, onDone: message => showNotice(message) })
  const surface = useSurfaceState()
  const nav = useSeatNavigation({ effectiveLayout, canvasRef, showNotice, surface })
  // オーバーレイ内ミニマップ用のフロア情報(開いているチームが決まってから組み立てる)
  const minimap = useMinimapPayload(effectiveLayout, nav.focus.payload?.teamId ?? null)

  return (
    <div className={styles.seatMapPage}>
      {!editor.isEditMode && <ViewModeHeader surface={surface} tours={tours} />}
      {ready && effectiveLayout && (
        <MapCanvas
          canvasRef={canvasRef}
          effectiveLayout={effectiveLayout}
          data={data}
          editor={editor}
          placement={placement}
          dialogs={dialogs}
          assign={assign}
          seatBulk={seatBulk}
          save={save}
          surface={surface}
          nav={nav}
          entries={entries}
          ensureEditSession={ensureEditSession}
        />
      )}
      <DirectorySidebar surface={surface} data={data} nav={nav} save={save} theme={theme} />
      <NoticeToasts unassignedNotice={unassignedNotice} save={save} />
      {!editor.isEditMode && (
        <ViewModePanels
          data={data}
          nav={nav}
          minimap={minimap}
          surface={surface}
          showNotice={showNotice}
        />
      )}
      <EditSurfaces
        editor={editor}
        data={data}
        save={save}
        placement={placement}
        tours={tours}
        sessionEnd={sessionEnd}
        ghostDelete={ghostDelete}
        assign={assign}
        seatBulk={seatBulk}
        entries={entries}
        surface={surface}
        nav={nav}
        ensureEditSession={ensureEditSession}
      />
      <TourLayers editor={editor} tours={tours} />
      <EditDialogs editor={editor} dialogs={dialogs} />
    </div>
  )
}
