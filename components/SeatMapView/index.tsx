import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { MAIN_TOUR_STEPS, MAIN_TOUR_STORAGE_KEY } from './utils/main-tour-steps'
import { AdminAddFab } from '@/components/AdminAddFab'
import { DetailPanels } from '@/components/DetailPanels'
import { EmployeeAssignSheet } from '@/components/EmployeeAssignSheet'
import { EmployeeDirectory } from '@/components/EmployeeDirectory'
import { FacilityHoverCard } from '@/components/FacilityHoverCard'
import type { FacilityHoverPayload } from '@/components/FacilityHoverCard'
import { FacilityPickerModal } from '@/components/FacilityPickerModal'
import { FurniturePickerModal } from '@/components/FurniturePickerModal'
import { GhostPlacementLayer } from '@/components/GhostPlacementLayer'
import type { GhostRequest } from '@/components/GhostPlacementLayer'
import { GuideButton } from '@/components/GuideButton'
import { LayoutSwitcher } from '@/components/LayoutSwitcher'
import { ObjectCategorySheet } from '@/components/ObjectCategorySheet'
import { TeamCategorySheet } from '@/components/TeamCategorySheet'
import { TeamCreatePopover } from '@/components/TeamCreatePopover'
import { TeamImportSheet } from '@/components/TeamImportSheet'
import { CoachMarkTour } from '@/components/CoachMarkTour'
import { readSeen, useCoachMarkTour } from '@/components/CoachMarkTour/hooks/use-coach-mark-tour'
import {
  EDIT_TOUR_BRANCH,
  EDIT_TOUR_STORAGE_KEY,
  FURNITURE_TOUR_STEPS,
  FURNITURE_TOUR_STORAGE_KEY,
  TEAM_TOUR_STEPS,
  TEAM_TOUR_STORAGE_KEY,
} from '@/components/CoachMarkTour/utils/tour-steps'
import { ConfirmDialog } from '@/components/edit/ConfirmDialog'
import { LiveRegion } from '@/components/a11y/components/LiveRegion'
import { SeatMapCanvas } from '@/components/SeatMapCanvas'
import type { SeatMapCanvasHandle } from '@/components/SeatMapCanvas'
import type { RecentPlacement } from '@/components/SeatMapCanvas/type'
import { TeamOverlay } from '@/components/TeamOverlay'
import { EditErrorToast } from '@/components/edit/EditErrorToast'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useSeatLayout } from '@/hooks/use-mock-data'
import { isGaroonConnected } from '@/lib/garoon/facilities'
import { useTheme } from '@/hooks/use-theme'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'
import { TOAST_MESSAGES } from '@/utils/toast-messages'
import { useLayoutEditor } from '@/hooks/use-layout-editor/use-layout-editor'
import { rectOfRef } from '@/utils/layout/layout-objects'
import type { Rect } from '@/utils/layout/rect'
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
  // 座標は論理(viewBox)のまま渡す — 画面座標への投影はチップ側が毎フレーム行い、
  // 表示中にパン・ズームしても対象の下辺に貼り付いたまま追従する
  const showUndoChipAt = useCallback(
    (rect: Rect, message: string, frame: Rect | null = null, recent: RecentPlacement | null = null) => {
      canvasRef.current?.showUndoChipAt({
        anchor: { x: rect.x + rect.w / 2, y: rect.y + rect.h },
        message,
        frame,
        recent,
      })
    },
    []
  )

  // 強調するのは会議室・家具だけ。チーム枠は面が広く、破線の枠とチップで十分に見つかる
  const recentOf = (target: GhostRequest['target'], rect: Rect): RecentPlacement | null => {
    if (target.type === 'add-facility') return { kind: 'facility', rect }
    if (target.type === 'add-furniture') return { kind: 'furniture', rect }
    if (target.type === 'reposition' && (target.ref.kind === 'facility' || target.ref.kind === 'furniture')) {
      return { kind: target.ref.kind, rect }
    }
    return null
  }

  // 閲覧モードのまま置き始めた時だけ編集セッションを起こす。既に編集中なら何もしない
  // (enterEditMode はワーキングコピーと undo スタックを作り直すので、二度呼ぶと編集内容が消える)
  const ensureEditSession = useCallback(() => {
    if (!editor.isEditMode) editor.enterEditMode()
  }, [editor])

  // 配置と掴み直しで文言を変える。対象の種別は配置フロー側だけが知っている
  const handlePlaced = useCallback(
    (rect: Rect, target: GhostRequest['target']) => {
      showUndoChipAt(
        rect,
        target.type === 'reposition' ? '移動しました' : '配置しました',
        null,
        recentOf(target, rect)
      )
    },
    [showUndoChipAt]
  )

  const placement = useObjectPlacement(editor, {
    onPlaced: handlePlaced,
    onEnsureEditMode: ensureEditSession,
  })

  // 削除の実行はここに集約する。ダイアログ経由(会議室・チーム)も即時(家具)も同じ後始末を通す。
  // チームだけ発行口が違う(所属座席ごと消えるため object-delete では扱えない)
  const handleDeleteObject = useCallback(
    (ref: LayoutObjectRef) => {
      const rect = effectiveLayout ? rectOfRef(effectiveLayout, ref) : null
      if (ref.kind === 'team') editor.deleteTeam(ref.id)
      else editor.deleteObject(ref)
      if (rect) showUndoChipAt(rect, '削除しました', rect)
      // 削除が成立した時だけゴーストを畳む。確認を開いた時点では畳まない —
      // 確認をやめた利用者が、動かした位置のゴーストへそのまま戻れるようにする
      if (placement.isActive) placement.cancel()
    },
    [editor, effectiveLayout, showUndoChipAt, placement.isActive, placement.cancel]
  )

  const dialogs = useEditDialogs(editor, employeeById, { onDeleteObject: handleDeleteObject })

  // 05-3: セッション中のチーム枠タップ = 移動ゴースト。実体はその場に残り、「配置」で初めて動く
  // (locked / fixedLayout のチームは startReposition が理由つきで弾く)
  const handleTeamTap = useCallback(
    (teamId: string) => placement.startReposition({ kind: 'team', id: teamId }),
    [placement.startReposition]
  )

  // 05-4:「大型」= shape:'executive' の一括適用。バーが持つ形状はこれ1つなのでここで固定する
  const handleSeatEnlarge = useCallback((seatIds: string[]) => editor.reshapeSeats(seatIds, 'executive'), [editor])

  // 05-4: 2席以上の一括削除。件数つきの確認を挟んでから1アクションで消す(undo 1回で戻る)。
  // 1席のときは既存の単独確認(dialogs.requestSeatDelete)がそのまま受ける
  const [bulkDeleteSeatIds, setBulkDeleteSeatIds] = useState<string[] | null>(null)
  const confirmBulkDelete = useCallback(() => {
    if (bulkDeleteSeatIds) editor.deleteSeats(bulkDeleteSeatIds)
    setBulkDeleteSeatIds(null)
  }, [bulkDeleteSeatIds, editor])

  // 配置フローはセッションの内側にある。ゴーストを畳まずにセッションだけ閉じると、
  // 読み取り専用の地図の上に暗幕とゴーストだけが残り、× 以外の逃げ道が無くなる
  const handleSessionCancel = useCallback(() => {
    placement.cancel()
    save.cancel()
  }, [placement.cancel, save.cancel])

  const handleSessionFinish = useCallback(() => {
    placement.cancel()
    save.finish()
  }, [placement.cancel, save.finish])

  // 04-4: 移動ゴーストの削除ボタン。ゴーストを畳んでから既存の削除経路へ渡す
  // (会議室は確認ダイアログ・チームは §07-3 のタイプ確認・家具は即時)
  const ghostDeleteRef = placement.repositioningRef
  const isGhostDeletable = ghostDeleteRef !== null
  // 削除確認が開いている間 = 削除処理中とみなす。新しい state を作らずダイアログの開閉から導く —
  // 導ければ、閉じ忘れでフラグが立ちっぱなしになる経路が生まれない
  const isGhostDeleting = dialogs.deleteObjectTarget !== null || dialogs.deleteTeamTarget !== null
  const handleGhostDelete = useCallback(() => {
    if (!ghostDeleteRef) return
    // ここでセッションを畳まない。畳むのは handleDeleteObject の中、削除が成立した後だけ
    dialogs.requestObjectDelete(ghostDeleteRef)
  }, [ghostDeleteRef, dialogs.requestObjectDelete])
  // 操作ガイド。編集モード初回だけ自動再生し、？ ボタンで何度でも見られる。
  // エンジンは isActive を直接受けないので、活性化(初回自動再生・退出時に畳む)は
  // ここ(呼び出し側)の責務として持つ
  const centerOnSelector = useCallback((selector: string) => canvasRef.current?.centerOnSelector(selector), [])
  const [tourReplayNonce, setTourReplayNonce] = useState(0)
  const tour = useCoachMarkTour({
    branch: EDIT_TOUR_BRANCH,
    storageKey: EDIT_TOUR_STORAGE_KEY,
    replayNonce: tourReplayNonce,
    autoStart: false,
    centerOnSelector,
  })
  const replayTour = useCallback(() => setTourReplayNonce((count) => count + 1), [])
  const wasEditModeRef = useRef(editor.isEditMode)
  useEffect(() => {
    const wasEditMode = wasEditModeRef.current
    wasEditModeRef.current = editor.isEditMode
    if (editor.isEditMode) {
      // 編集モードへ初めて入った時だけ、未読なら自動再生する
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!wasEditMode && !readSeen(EDIT_TOUR_STORAGE_KEY)) replayTour()
      return
    }
    // 編集モードを抜けたらツアーも畳む。画面都合の折りたたみなので既読化はしない(collapse)。
    // 一度も操作していないツアーを close で既読化すると、次に編集モードへ入っても自動再生されなくなる
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wasEditMode) tour.collapse()
  }, [editor.isEditMode, replayTour, tour.collapse])
  // §05-7: FABの「チーム」「設備」はそれぞれ独立フロー+独立キーを持つ。どちらもゴーストが
  // 画面中央に出るのでスポットライトする対象が無く、中央カードのまま3ステップ流すだけになる。
  // 自動再生の判定は「メニュー項目を選んだ時点」(§01)で行うので、マウント時の autoStart は切る
  const [teamTourReplayNonce, setTeamTourReplayNonce] = useState(0)
  const teamTour = useCoachMarkTour({
    steps: TEAM_TOUR_STEPS,
    storageKey: TEAM_TOUR_STORAGE_KEY,
    replayNonce: teamTourReplayNonce,
    autoStart: false,
  })
  const replayTeamTour = useCallback(() => setTeamTourReplayNonce((count) => count + 1), [])
  const [furnitureTourReplayNonce, setFurnitureTourReplayNonce] = useState(0)
  const furnitureTour = useCoachMarkTour({
    steps: FURNITURE_TOUR_STEPS,
    storageKey: FURNITURE_TOUR_STORAGE_KEY,
    replayNonce: furnitureTourReplayNonce,
    autoStart: false,
  })
  const replayFurnitureTour = useCallback(() => setFurnitureTourReplayNonce((count) => count + 1), [])
  // メイン(閲覧)画面の使い方ガイド。編集ツアーとは別インスタンス・別 storageKey で、
  // 初回未読なら自動再生(autoStart 既定 true)、以降はヘッダーの使い方ガイドボタンで再生する
  const [mainTourReplayNonce, setMainTourReplayNonce] = useState(0)
  const mainTour = useCoachMarkTour({
    steps: MAIN_TOUR_STEPS,
    storageKey: MAIN_TOUR_STORAGE_KEY,
    replayNonce: mainTourReplayNonce,
    centerOnSelector,
  })
  const replayMainTour = useCallback(() => setMainTourReplayNonce((count) => count + 1), [])
  // §05-7:「?」は今居る導線のガイドを再生する。判断材料は配置フローが運んでいる種別だけで、
  // 掴み直し(reposition)と未配置(null)はレイアウト編集の導線なので分岐ツアーを出す
  const handleHelp = useCallback(() => {
    const targetType = placement.request?.target.type
    if (targetType === 'add-team') replayTeamTour()
    else if (targetType === 'add-furniture' || targetType === 'add-facility') replayFurnitureTour()
    else replayTour()
  }, [placement.request, replayTeamTour, replayFurnitureTour, replayTour])
  // §01の「メニュー項目を選んだ時点」。未読ならガイドを1回だけ出してから本来の導線へ進む。
  // 既読化はツアーを閉じた時にエンジン側が行うので、ここでは書き込まない
  const handleSelectTeam = useCallback(() => {
    if (!readSeen(TEAM_TOUR_STORAGE_KEY)) replayTeamTour()
    placement.selectCategory('team')
  }, [replayTeamTour, placement.selectCategory])
  const handleSelectFacility = useCallback(() => {
    if (!readSeen(FURNITURE_TOUR_STORAGE_KEY)) replayFurnitureTour()
    placement.openCategory()
  }, [replayFurnitureTour, placement.openCategory])
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
    tours: [tour, mainTour, teamTour, furnitureTour],
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

  // §03-3 配置済み判定の材料。予定システムの施設ID(Facility.facilityId)を持つ分だけが
  // Garoon マスタと突き合わせられる(レイアウト上の Facility.id とは別物)
  const placedFacilityIds = useMemo(
    () =>
      (effectiveLayout?.facilities ?? [])
        .map((facility) => facility.facilityId)
        .filter((facilityId): facilityId is string => facilityId !== undefined),
    [effectiveLayout]
  )

  // カードの「座席へ移動」。畳んでから飛ばす — 逆順だとオーバーレイの上にシートの暗幕が残る
  const handleGoToSeat = useCallback(() => {
    if (!personSeat) return
    closeAll()
    setIsDirectoryOpen(false)
    focus.focusSeat(personSeat)
  }, [personSeat, closeAll, focus.focusSeat, setIsDirectoryOpen])

  // 「自分の席」ボタン。検索と同じ focusSeat を通し、分岐はここ(席の引き当て)だけに持つ
  const handleGoToMySeat = useCallback(() => {
    const seat = effectiveLayout?.seats.find((candidate) => candidate.employeeId === SELF_EMPLOYEE_ID)
    if (!seat) {
      showNotice('座席未設定')
      return
    }
    focus.focusSeat(seat)
  }, [effectiveLayout, focus.focusSeat, showNotice])

  return (
    <div className={styles.seatMapPage}>
      {!editor.isEditMode && (
        <AppHeader onOpenDirectory={() => setIsDirectoryOpen(true)} isDirectoryOpen={isDirectoryOpen} />
      )}
      {/* 編集中は土台(公式/カスタム)を差し替えさせない。差し替えるとワーキングコピーが宙に浮く */}
      {!editor.isEditMode && <LayoutSwitcher onExpandedChange={setIsLayoutSwitcherOpen} />}
      {/* 使い方ガイドの入口。アイランドと同じ行に並べたいので、ヘッダーではなくここで描く */}
      {!editor.isEditMode && (
        <GuideButton ariaLabel='使い方ガイド' onClick={replayMainTour} className={styles.mapGuideButton} />
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
          onHelp={handleHelp}
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
      <ObjectCategorySheet
        isOpen={placement.isCategoryOpen}
        categories={['furniture', 'facility']}
        isGaroonConnected={isGaroonConnected()}
        onSelect={placement.selectCategory}
        onClose={placement.cancel}
      />
      <FurniturePickerModal
        isOpen={placement.isFurniturePickerOpen}
        onSelect={placement.selectFurniture}
        onClose={placement.cancel}
      />
      {/* §03-3: 施設は Garoon マスタから選んでからゴーストへ進む */}
      <FacilityPickerModal
        isOpen={placement.isFacilityPickerOpen}
        placedFacilityIds={placedFacilityIds}
        onSelect={placement.selectFacility}
        onClose={placement.cancel}
      />
      <TeamCategorySheet
        isOpen={placement.isTeamCategoryOpen}
        onSelectImport={placement.startTeamImport}
        onSelectCreate={placement.startTeamCreate}
        onClose={placement.cancel}
      />
      {/* §02-3: 取り込みはゴーストを通らず、確定時にスパイラル探索でまとめて置く */}
      <TeamImportSheet
        isOpen={placement.isTeamImportOpen}
        onConfirm={placement.submitTeamImport}
        onClose={placement.cancel}
      />
      {/* §02-2: 名前/色ダイアログはゴーストの「配置」で位置が決まった後に開く */}
      <TeamCreatePopover
        isOpen={placement.isTeamFormOpen}
        onSubmit={placement.submitTeam}
        onClose={placement.cancel}
      />
      {placement.request && (
        <GhostPlacementLayer
          request={placement.request}
          placement={placement.placement}
          isDeleting={isGhostDeleting}
          onConfirm={placement.confirm}
          onCancel={placement.cancel}
          onDelete={isGhostDeletable ? handleGhostDelete : undefined}
        />
      )}

      {editor.errorToast && <EditErrorToast key={editor.errorToast.id} message={editor.errorToast.message} />}

      {editor.isEditMode && (
        <>
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
          {/* 07-2 の一括削除確認。タイトル行・アイコンバッジ・× を持つ 07-1 の共通シェルは別担当で、
              ここは本文と主ボタン文言だけを仕様どおりに渡す */}
          {bulkDeleteSeatIds && (
            <ConfirmDialog
              ariaLabel={`${bulkDeleteSeatIds.length}席を削除しますか？`}
              message={`選択した${bulkDeleteSeatIds.length}席を削除します。配置済みの社員は解除されます。この操作は保存後に確定されます。`}
              confirmLabel='削除する'
              onConfirm={confirmBulkDelete}
              onCancel={() => setBulkDeleteSeatIds(null)}
            />
          )}
        </>
      )}

      {editor.isEditMode && <CoachMarkTour tour={tour} />}
      {!editor.isEditMode && <CoachMarkTour tour={mainTour} />}
      {/* §05-7: この2つは常時マウントする。FAB はセッションの外で押され、
          選択と同じフレームで ensureEditSession が isEditMode を立てるので、
          isEditMode ガードを掛けると初回の自動再生とタイミングがずれる */}
      <CoachMarkTour tour={teamTour} />
      <CoachMarkTour tour={furnitureTour} />

      <EditDialogs editor={editor} dialogs={dialogs} />

    </div>
  )
}
