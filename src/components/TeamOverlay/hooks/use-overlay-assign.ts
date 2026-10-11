import { useCallback, useMemo, useState } from 'react'
import { useBulkAssign } from './use-bulk-assign'
import type { UseBulkAssignResult } from './use-bulk-assign'
import type { UseOverlayEditModeResult } from './use-overlay-edit-mode'
import type { SeatGrid } from '../type'
import { buildSeatByEmployee } from '@/components/EmployeeAssignSheet/hooks/use-employee-assign'
import type { Employee, Seat, TeamOverlayPayload } from '@/types'

// TeamOverlay の配属まわりの配線だけを持つ。シートの開閉・単体配属・確認文言・一括配置。
// 席の追加/削除やセッションの終了は別のフックが持つ

// §07-4「場所表記はチーム名(生の座席IDは出さない)」。レイアウトから名前を引けなかった時の
// 逃げ道もチーム名相当の語にする — ここで座席IDへフォールバックすると仕様違反が復活する
const UNKNOWN_TEAM_NAME = '別のチーム'

// §07-4 配属確認の内容。文字列の組み立てはこの純関数に閉じ、描画側は受け取った値を並べるだけにする
export type AssignConfirmContent = {
  title: string
  message: string
  supplement: string
  confirmLabel: string
}

type AssignConfirmInput = {
  // 配属しようとしている社員の氏名
  employeeName: string
  // その社員が今座っている席のチーム名。どこにも座っていなければnull
  fromTeamName: string | null
  // 配属先の席が属するチーム名(=オーバーレイで開いているチーム)
  toTeamName: string
  // 配属先の席に今座っている社員の氏名。空席ならnull
  occupantName: string | null
  // 移動元と移動先が同じチームか
  isSameTeam: boolean
}

// 対象が空席×未配属者なら確認なし(null)。それ以外は§07-4の3ケースへ振り分ける。
// 補足行は「実際に起きること」に合わせて選ぶ — use-seat-draft-state.assignEmployee は、
// 配属先に人が居れば その人を移動元の席へ入れ替え、居なければ移動元を空席にするため
const buildAssignConfirmContent = ({
  employeeName,
  fromTeamName,
  toTeamName,
  occupantName,
  isSameTeam,
}: AssignConfirmInput): AssignConfirmContent | null => {
  // 空席 × 未配属者は即配属(§06-4)
  if (fromTeamName === null && occupantName === null) return null
  // 未配属者を在席中の席へ入れる = 担当者差し替え
  if (fromTeamName === null) {
    return {
      title: '社員を変更しますか？',
      message: `${toTeamName}の担当者を${employeeName}に変更しますか？`,
      supplement: `現在の${occupantName}は解除されます`,
      confirmLabel: '変更する',
    }
  }
  return {
    title: '社員の席を移動しますか？',
    message: isSameTeam
      ? `${employeeName}は現在、${fromTeamName}に配属されています。同じ${fromTeamName}内で席を移動しますか？`
      : `${employeeName}は現在、${fromTeamName}に配属されています。${toTeamName}へ移動しますか？`,
    supplement:
      occupantName === null
        ? `${fromTeamName}の元の席は空席になります`
        : `現在の${occupantName}は${fromTeamName}へ移動します`,
    confirmLabel: '移動する',
  }
}

type Params = {
  payload: TeamOverlayPayload | null
  employeeById: Map<string, Employee>
  seatGrid: SeatGrid
  editMode: UseOverlayEditModeResult
  // 下書き反映済みの全座席。保存済みの座席を見ると同一セッション中の配属が確認文言へ反映されない
  draftAppliedSeats: Seat[]
  // §07-4 の「場所表記はチーム名」を満たすための チームid → 名前
  teamNameById: Map<string, string>
  announce: (message: string) => void
}

export type UseOverlayAssignResult = {
  assignSeatId: string | null
  assignTargetSeat: Seat | null
  assignEmployees: Employee[]
  // §06-4: このopenがヘッダーの「部署一括取込」から来たものならtrue
  assignInitialBulkMode: boolean
  handleAssignSeat: (seatId: string) => void
  handleAssignSelect: (employeeId: string) => void
  // §06-4 single: 確認が要る候補(空席×未配属以外)を選んだ時の口
  handleAssignSelectRequiringConfirm: (employeeId: string) => void
  assignConfirm: AssignConfirmContent | null
  confirmAssignSelect: () => void
  cancelAssignSelect: () => void
  handleAssignClear: () => void
  handleAssignClose: () => void
  bulkAssign: UseBulkAssignResult
  handleBulkAssignRequest: () => void
  handleBulkAssignSelected: (employeeIds: string[]) => void
  handleOpenBulkAssign: () => void
  canOpenBulkAssign: boolean
}

export const useOverlayAssign = ({
  payload,
  employeeById,
  seatGrid,
  editMode,
  draftAppliedSeats,
  teamNameById,
  announce,
}: Params): UseOverlayAssignResult => {
  // STEP C2: 社員検索シートはキャンバス編集(SeatMapView)と同じ EmployeeAssignSheet をそのまま使う。
  // 確定先だけこちらは assignmentsOverride(draft.assignEmployee)へ差し替え、localStorage への保存は
  // 一切行わない(保存は EditDock の保存ボタン → seatCommit.commit のみが担う。STEP D3)
  const [assignSeatId, setAssignSeatId] = useState<string | null>(null)

  // §06-4: このopenがbulk入口(ヘッダー「部署一括取込」)から来たものかどうか。
  // handleAssignSeat(単体クリック)/handleOpenBulkAssign(bulk入口)の両方がここを立て直す
  const [assignInitialBulkMode, setAssignInitialBulkMode] = useState(false)

  // 対象席は seatGrid(差分反映済み)から引く。判定基準を二重に持たないため、下書き追加席・
  // 割当上書きの解決は use-seat-layout-compose 側の1本にそのまま委ねる
  const assignTargetSeat = useMemo(
    () => seatGrid.positionedSeats.find((p) => p.seat.id === assignSeatId)?.seat ?? null,
    [seatGrid, assignSeatId]
  )

  // 検索対象は組織全員。employeeById は SeatMapView から渡ってくる同じ Map をそのまま使う
  const assignEmployees = useMemo(() => [...employeeById.values()], [employeeById])

  const handleAssignSeat = useCallback((seatId: string) => {
    setAssignInitialBulkMode(false)
    setAssignSeatId(seatId)
  }, [])

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

  // §07-4: 確認待ちの社員。ここに値が入っている間だけ確認ダイアログを描く
  const [assignConfirmEmployeeId, setAssignConfirmEmployeeId] = useState<string | null>(null)

  const handleAssignSelectRequiringConfirm = useCallback(
    (employeeId: string) => setAssignConfirmEmployeeId(employeeId),
    []
  )

  const assignConfirm = useMemo<AssignConfirmContent | null>(() => {
    if (!assignConfirmEmployeeId || !assignSeatId || !payload) return null
    const employee = employeeById.get(assignConfirmEmployeeId)
    if (!employee) return null
    // 「今どこに座っているか」も「配属先に誰が居るか」も下書き反映済みの座席から引く。
    // 保存済みの座席を見ると同一セッション中の配属が確認文言へ反映されない
    const fromSeat = buildSeatByEmployee(draftAppliedSeats).get(employee.id) ?? null
    const targetSeat = draftAppliedSeats.find((seat) => seat.id === assignSeatId) ?? null
    const occupantId = targetSeat?.employeeId ?? null
    const occupant = occupantId !== null && occupantId !== employee.id ? employeeById.get(occupantId) ?? null : null
    return buildAssignConfirmContent({
      employeeName: employee.name,
      fromTeamName: fromSeat ? teamNameById.get(fromSeat.teamId) ?? UNKNOWN_TEAM_NAME : null,
      toTeamName: payload.teamName,
      occupantName: occupant ? occupant.name : null,
      isSameTeam: fromSeat !== null && fromSeat.teamId === payload.teamId,
    })
  }, [assignConfirmEmployeeId, assignSeatId, payload, employeeById, draftAppliedSeats, teamNameById])

  const confirmAssignSelect = useCallback(() => {
    if (assignConfirmEmployeeId) handleAssignSelect(assignConfirmEmployeeId)
    setAssignConfirmEmployeeId(null)
  }, [assignConfirmEmployeeId, handleAssignSelect])

  const cancelAssignSelect = useCallback(() => setAssignConfirmEmployeeId(null), [])

  // §06-4 bulk: 一括配置。対象は draftAppliedSeats(下書き反映済みの全座席)から引くため、
  // 選択中の特定席とは独立に、選ばれた社員を空セルへ詰めていく
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

  // シートを閉じてから一括配置を要求する。移動確認が要れば ConfirmDialog 側で続きを引き継ぐ。
  // employeeIds を渡さない旧経路(部署まるごと取込)は null を渡して従来どおりに振る舞わせる
  const handleBulkAssignRequest = useCallback(() => {
    setAssignSeatId(null)
    bulkAssign.requestBulkAssign(null)
  }, [bulkAssign])

  const handleBulkAssignSelected = useCallback(
    (employeeIds: string[]) => {
      setAssignSeatId(null)
      bulkAssign.requestBulkAssign(employeeIds)
    },
    [bulkAssign]
  )

  // §06-4: bulk の入口は編集モードのヘッダー。シート自体は「対象席」を要求する作りなので、
  // グリッド先頭の席を代表として開く(一括配置は空セルを行優先で埋めるため、どの席を代表に
  // しても結果は変わらない)。席が1件も無いチームでは開けないためボタン自体を出さない
  const bulkEntrySeatId = seatGrid.positionedSeats[0]?.seat.id ?? null
  const handleOpenBulkAssign = useCallback(() => {
    if (!bulkEntrySeatId) return
    // §06-4: bulk入口をヘッダーのこのボタン1つに揃えるため、開いた瞬間からチェックボックス
    // 一括選択モードにする(シート内の同名ボタンは従来通りチェックボックスモードへの切替を担う)
    setAssignInitialBulkMode(true)
    setAssignSeatId(bulkEntrySeatId)
  }, [bulkEntrySeatId])

  return {
    assignSeatId,
    assignTargetSeat,
    assignEmployees,
    assignInitialBulkMode,
    handleAssignSeat,
    handleAssignSelect,
    handleAssignSelectRequiringConfirm,
    assignConfirm,
    confirmAssignSelect,
    cancelAssignSelect,
    handleAssignClear,
    handleAssignClose,
    bulkAssign,
    handleBulkAssignRequest,
    handleBulkAssignSelected,
    handleOpenBulkAssign,
    canOpenBulkAssign: bulkEntrySeatId !== null,
  }
}
