import Head from 'next/head'
import { useRouter } from 'next/router'
import { useCallback, useMemo, useRef, useState } from 'react'
import { SeatMapCanvas } from '@/components/SeatMapCanvas'
import type { SeatMapCanvasHandle, TeamPresenceCounts } from '@/components/SeatMapCanvas'
import { DetailPanels } from '@/components/DetailPanels'
import { TeamOverlay } from '@/components/TeamOverlay'
import type { TeamOverlayPayload } from '@/components/TeamOverlay'
import { FacilityHoverCard } from '@/components/FacilityHoverCard'
import type { FacilityHoverPayload } from '@/components/FacilityHoverCard'
import { EmployeeDirectory } from '@/components/EmployeeDirectory'
import { AvatarCustomizer } from '@/components/AvatarCustomizer'
import { PixelAvatar } from '@/components/PixelAvatar'
import { EditModeToggle } from '@/components/edit/EditModeToggle'
import { EditBadge, EditTopControls } from '@/components/edit/EditBadgeAndControls'
import { EditRemoteBar } from '@/components/edit/EditRemoteBar'
import { DeleteConfirmDialog } from '@/components/edit/DeleteConfirmDialog'
import { TeamChangeSheet } from '@/components/edit/TeamChangeSheet'
import { TeamRelayoutModal } from '@/components/edit/TeamRelayoutModal'
import { EditErrorToast } from '@/components/edit/EditErrorToast'
import { DetailPanelProvider, useDetailPanel } from '@/lib/detail-panel-context'
import { useEmployees, useFacilityMeetings, useSchedules, useSeatLayout } from '@/lib/mock-loader'
import { fetchMock } from '@/lib/fetch-mock'
import { deriveFacilityState } from '@/lib/facility-status'
import type { FacilityState } from '@/lib/facility-status'
import { computePresenceMap } from '@/lib/presence'
import { useQuantizedClock } from '@/lib/use-quantized-clock'
import { useLayoutEditor } from '@/lib/use-layout-editor'
import { resolveTeamColor, useTeamColorMap } from '@/lib/team-colors'
import { SelectedDateProvider, jstDateKey, jstKeyFromIso, useSelectedDate } from '@/lib/selected-date-context'
import { SELF_EMPLOYEE_ID, SelfAvatarProvider, useSelfAvatar } from '@/lib/self-avatar-context'
import type { Employee, Seat } from '@/lib/types'

// 完了処理の疑似遅延(01のfetchMock経由に準拠した保存中表現)
const FINISH_DELAY_MS = 400

const SeatMapView = () => {
  const { openSeatDetail, openFacilityDetail } = useDetailPanel()
  const { layout, persistLayout, resetLayout } = useSeatLayout()
  const { data: employees } = useEmployees()
  const { data: schedules } = useSchedules()
  const { data: facilityMeetings } = useFacilityMeetings()
  const { debouncedDate, isTodaySelected } = useSelectedDate()
  const teamColorMap = useTeamColorMap()
  // 08: 本人アバターの共有状態(localStorage override + 編集モーダル起動)
  const { override: selfAvatarOverride, selfAvatar, openEditor } = useSelfAvatar()
  // 現在時刻の進行中判定は「今日」を表示中の時だけ稼働
  const nowMs = useQuantizedClock(isTodaySelected)
  const canvasRef = useRef<SeatMapCanvasHandle>(null)
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false)
  // 10: チームバウンダリのタップで開く大型オーバーレイ(payload=null で閉)
  const [teamOverlay, setTeamOverlay] = useState<TeamOverlayPayload | null>(null)
  const [hoverFacility, setHoverFacility] = useState<FacilityHoverPayload | null>(null)
  // 05: 座席未設定(防御分岐)時の一時通知文言
  const [unassignedNotice, setUnassignedNotice] = useState<string | null>(null)

  // 07: 編集モード(ワーキングコピー+undoスタック+アクション発行)
  const editor = useLayoutEditor(layout)
  const [isSaving, setIsSaving] = useState(false)
  // 07: 「完了」で保存が発生した時だけ表示する一過性トースト
  const [saveToast, setSaveToast] = useState<string | null>(null)
  const saveToastTimeoutRef = useRef<number | null>(null)
  // 座席1件のチーム変更シート対象(seatId)
  const [teamChangeSeatId, setTeamChangeSeatId] = useState<string | null>(null)
  // 座席削除確認ダイアログ対象(seatId)
  const [deleteConfirmSeatId, setDeleteConfirmSeatId] = useState<string | null>(null)
  // チームレイアウトエディタ対象(teamId)
  const [relayoutTeamId, setRelayoutTeamId] = useState<string | null>(null)

  // 08: 本人(emp-001)の表示アバターは保存済み override を優先
  const employeeById = useMemo(
    () =>
      new Map(
        (employees ?? []).map((e) =>
          selfAvatarOverride && e.id === SELF_EMPLOYEE_ID ? [e.id, { ...e, avatar: selfAvatarOverride }] : [e.id, e]
        )
      ),
    [employees, selfAvatarOverride]
  )

  // debouncedDate 当日分のイベントに絞ってから再席判定
  const schedulesForDate = useMemo(() => {
    const key = jstDateKey(debouncedDate)
    return (schedules ?? []).filter((s) => jstKeyFromIso(s.start) === key)
  }, [schedules, debouncedDate])

  // 07: 編集モード中は在席状態の再計算を停止(baseline時点のスナップショットで固定)
  const presenceMap = useMemo(
    () => computePresenceMap(schedulesForDate, nowMs, isTodaySelected),
    [schedulesForDate, nowMs, isTodaySelected]
  )
  const frozenPresenceMapRef = useRef(presenceMap)
  if (!editor.isEditMode) frozenPresenceMapRef.current = presenceMap
  const effectivePresenceMap = editor.isEditMode ? frozenPresenceMapRef.current : presenceMap

  // 07: 表示ソース切り替え(編集中はeditingLayout・それ以外は通常ロード分)
  const effectiveLayout = editor.isEditMode ? editor.editingLayout ?? layout : layout

  // 06: チーム毎の在席内訳(present/meeting/out/vacation)。凡例の補助表示に使用
  const teamPresenceCounts = useMemo(() => {
    const counts = new Map<string, TeamPresenceCounts>()
    if (!effectiveLayout) return counts
    for (const seat of effectiveLayout.seats) {
      if (!seat.employeeId) continue
      const status = effectivePresenceMap.get(seat.employeeId) ?? 'present'
      const entry = counts.get(seat.teamId) ?? { present: 0, meeting: 0, out: 0, vacation: 0 }
      entry[status] += 1
      counts.set(seat.teamId, entry)
    }
    return counts
  }, [effectiveLayout, effectivePresenceMap])

  // 会議室状態(今日表示中のみ現在時刻で導出。他日は連携有無だけ)
  const nowMin = useMemo(() => {
    const d = new Date(nowMs)
    return d.getHours() * 60 + d.getMinutes()
  }, [nowMs])
  const facilityStateById = useMemo(() => {
    const map = new Map<string, FacilityState>()
    if (!effectiveLayout) return map
    const meetings = facilityMeetings ?? []
    for (const f of effectiveLayout.facilities) {
      map.set(
        f.id,
        isTodaySelected
          ? deriveFacilityState(f, meetings, nowMin)
          : { status: f.facilityId ? 'available' : 'unlinked' }
      )
    }
    return map
  }, [effectiveLayout, facilityMeetings, nowMin, isTodaySelected])

  const ready = layout && employees && schedules

  // 05: ディレクトリの社員選択 → 座席ジャンプ+パルス→詳細パネル(座席未設定は防御分岐)
  const handleSelectEmployee = useCallback(
    (_employee: Employee, seat: Seat | null) => {
      setIsDirectoryOpen(false)
      if (!seat) {
        // 種データは全員配置済みのため通常到達しない防御分岐
        setUnassignedNotice('座席未設定')
        window.setTimeout(() => setUnassignedNotice(null), 2400)
        return
      }
      canvasRef.current?.jumpToSeat(seat, () => openSeatDetail(seat.id))
    },
    [openSeatDetail]
  )

  // 08: アバター編集モーダルを開く
  const handleOpenAvatarEditor = useCallback(() => openEditor(), [openEditor])

  // 07: 「完了」— baselineとの差分が無ければ何も保存せず終了。差分があればlocalStorageへ保存して終了
  const handleFinish = useCallback(() => {
    const layoutToSave = editor.editingLayout
    if (editor.changedCount === 0 || !layoutToSave) {
      editor.finishEdit()
      return
    }
    setIsSaving(true)
    // 400msの疑似遅延(01のfetchMock経由)。保存中は「完了」を無効化
    fetchMock(true, FINISH_DELAY_MS).then(async () => {
      await persistLayout(layoutToSave)
      setIsSaving(false)
      editor.finishEdit()
      setSaveToast('保存しました')
      if (saveToastTimeoutRef.current !== null) window.clearTimeout(saveToastTimeoutRef.current)
      saveToastTimeoutRef.current = window.setTimeout(() => setSaveToast(null), 2400)
    })
  }, [editor, persistLayout])

  const handleCancel = useCallback(() => {
    editor.cancelEdit()
  }, [editor])

  // 07: 設定操作「レイアウトをリセット」— 保存分を削除して種データへ復帰
  const handleResetLayout = useCallback(() => {
    void resetLayout()
  }, [resetLayout])

  // 07: 着席中は確認ダイアログを経由し、空席は即時削除(seat-delete発行)
  const handleSeatDeleteRequest = useCallback(
    (seatId: string) => {
      const seat = editor.editingLayout?.seats.find((s) => s.id === seatId)
      if (seat?.employeeId) {
        setDeleteConfirmSeatId(seatId)
      } else {
        editor.deleteSeat(seatId)
      }
    },
    [editor]
  )

  const handleSeatChangeTeamRequest = useCallback((seatId: string) => {
    setTeamChangeSeatId(seatId)
  }, [])

  const deleteTargetSeat = editor.editingLayout?.seats.find((s) => s.id === deleteConfirmSeatId) ?? null
  const deleteTargetEmployeeName = deleteTargetSeat?.employeeId
    ? employeeById.get(deleteTargetSeat.employeeId)?.name ?? null
    : null

  const teamChangeTargetSeat = editor.editingLayout?.seats.find((s) => s.id === teamChangeSeatId) ?? null
  const relayoutTargetTeam = editor.editingLayout?.teams.find((t) => t.id === relayoutTeamId) ?? null
  const relayoutTargetSeatCount = relayoutTeamId
    ? editor.editingLayout?.seats.filter((s) => s.teamId === relayoutTeamId).length ?? 0
    : 0

  return (
    <div className='seat-map-page'>
      {!editor.isEditMode && (
        <header className='app-header'>
          <button
            type='button'
            className='app-header-btn'
            aria-label='メニュー'
            onClick={() => setIsDirectoryOpen(true)}
          >
            <span className='material-symbols-outlined' aria-hidden='true'>
              menu
            </span>
          </button>
          <span className='app-header-title'>座席マップ</span>
          <div className='app-header-right'>
            {/* 07: レイアウトをリセット(保存分削除→種データ復元)。役割トグルの隣に設置 */}
            <button
              type='button'
              className='app-header-btn'
              aria-label='レイアウトをリセット'
              onClick={handleResetLayout}
            >
              <span className='material-symbols-outlined' aria-hidden='true'>
                restart_alt
              </span>
            </button>
            <EditModeToggle isEditMode={editor.isEditMode} onEnterEdit={editor.enterEditMode} />
            {selfAvatar && (
              <button
                type='button'
                className='app-header-avatar'
                aria-label='アバターを編集'
                onClick={handleOpenAvatarEditor}
              >
                <PixelAvatar config={selfAvatar} size={30} />
              </button>
            )}
          </div>
        </header>
      )}
      {ready && effectiveLayout && (
        <SeatMapCanvas
          ref={canvasRef}
          layout={effectiveLayout}
          employeeById={employeeById}
          presenceMap={effectivePresenceMap}
          teamPresenceCounts={teamPresenceCounts}
          onSeatSelect={openSeatDetail}
          onFacilitySelect={openFacilityDetail}
          onTeamBoundaryClick={setTeamOverlay}
          facilityStateById={facilityStateById}
          onFacilityHover={setHoverFacility}
          isEditMode={editor.isEditMode}
          onSeatMove={editor.moveSeat}
          onTeamMove={editor.moveTeam}
          onTeamLabelTap={setRelayoutTeamId}
          onSeatChangeTeamRequest={handleSeatChangeTeamRequest}
          onSeatDeleteRequest={handleSeatDeleteRequest}
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
      {saveToast && <div className='emp-dir-unassigned-toast' role='status'>{saveToast}</div>}
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
      {!editor.isEditMode && hoverFacility && effectiveLayout && (() => {
        const f = effectiveLayout.facilities.find((x) => x.id === hoverFacility.facilityId)
        const st = facilityStateById.get(hoverFacility.facilityId)
        return f && st ? <FacilityHoverCard facility={f} state={st} empById={employeeById} rect={hoverFacility.rect} /> : null
      })()}
      {!editor.isEditMode && <DetailPanels />}

      {editor.isEditMode && (
        <>
          <EditBadge />
          <EditTopControls onHelp={() => {}} onExit={handleCancel} />
          <EditRemoteBar
            changedCount={editor.changedCount}
            isSaving={isSaving}
            onFinish={handleFinish}
            onCancel={handleCancel}
          />
        </>
      )}

      {editor.errorToast && <EditErrorToast key={editor.errorToast.id} message={editor.errorToast.message} />}

      {deleteConfirmSeatId && (
        <DeleteConfirmDialog
          employeeName={deleteTargetEmployeeName}
          onCancel={() => setDeleteConfirmSeatId(null)}
          onConfirm={() => {
            editor.deleteSeat(deleteConfirmSeatId)
            setDeleteConfirmSeatId(null)
          }}
        />
      )}

      {teamChangeSeatId && teamChangeTargetSeat && editor.editingLayout && (
        <TeamChangeSheet
          teams={editor.editingLayout.teams}
          currentTeamId={teamChangeTargetSeat.teamId}
          colorOf={(teamId, teamName) => resolveTeamColor(teamColorMap, teamId, teamName)}
          onSelect={(teamId) => {
            editor.assignSeat(teamChangeSeatId, teamId)
            setTeamChangeSeatId(null)
          }}
          onClose={() => setTeamChangeSeatId(null)}
        />
      )}

      {relayoutTeamId && relayoutTargetTeam && (
        <TeamRelayoutModal
          team={relayoutTargetTeam}
          seatCount={relayoutTargetSeatCount}
          onApply={(rows, cols) => editor.relayoutTeam(relayoutTeamId, rows, cols)}
          onClose={() => setRelayoutTeamId(null)}
        />
      )}

      {/* 08: アバター編集モーダル(開いている時のみマウント) */}
      <AvatarCustomizer />
    </div>
  )
}

const SITE_URL = 'https://j-paku.github.io/seatmap-demo/'
const SITE_TITLE = 'seat-map デモ'
const SITE_DESCRIPTION =
  'モックデータのみで再現した企業向け座席マップアプリのデモ。バックエンドなし、localStorageとモック生成のみで動作します。'

const HomePage = () => {
  // GitHub Pages配信(basePath付与)でも favicon が404にならないよう router から basePath を取得
  const { basePath } = useRouter()

  return (
    <>
      <Head>
        <title>{SITE_TITLE}</title>
        <meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' />
        <meta name='description' content={SITE_DESCRIPTION} />
        <meta property='og:type' content='website' />
        <meta property='og:title' content={SITE_TITLE} />
        <meta property='og:description' content={SITE_DESCRIPTION} />
        <meta property='og:url' content={SITE_URL} />
        <meta name='twitter:card' content='summary' />
        <meta name='twitter:title' content={SITE_TITLE} />
        <meta name='twitter:description' content={SITE_DESCRIPTION} />
        <link rel='icon' href={`${basePath}/favicon.ico`} />
      </Head>
      <div className='seat-map-root'>
        <SelfAvatarProvider>
          <SelectedDateProvider>
            <DetailPanelProvider>
              <SeatMapView />
            </DetailPanelProvider>
          </SelectedDateProvider>
        </SelfAvatarProvider>
      </div>
    </>
  )
}

export default HomePage
