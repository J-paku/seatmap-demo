import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import { useBulkAssign } from './use-bulk-assign'
import type { UseBulkAssignResult } from './use-bulk-assign'
import { useDraftAppliedSeats } from './use-draft-applied-seats'
import type { UseOverlayEditModeResult } from './use-overlay-edit-mode'
import { useSeatCommit } from './use-seat-commit'
import type { UseSeatCommitResult } from './use-seat-commit'
import type { UseSeatSelectionResult } from './use-seat-selection'
import type { SeatGrid } from '../type'
import { buildSeatByEmployee } from '@/components/EmployeeAssignSheet/hooks/use-employee-assign'
import { useSeatLayout } from '@/hooks/use-mock-data'
import type { GridCell } from '@/utils/layout/seat-grid-draft'
import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH } from '@/utils/layout/seat-relayout'
import { TOAST_MESSAGES } from '@/utils/toast-messages'
import type { Employee, Seat, TeamOverlayPayload } from '@/types'

// TeamOverlayの編集配線をまとめて持つ。選択のトグル・席追加とその直後のハイライト・
// 配属シートの開閉・一括配置・保存/取消・編集中の閉じる拒否は、どれも「編集セッション1つ」に
// 属する配線なので1本にまとめる(index.tsxは組み立てだけを残す)

// STEP B5: 追加直後の席をハイライト(選択状態を流用)しておく時間。この間に別のセル/席を
// 選択し直した場合はハイライトを奪わない(下のuseEffectがisSeatSelectedの変化で再評価する)
const SEAT_ADD_HIGHLIGHT_MS = 1800

// §07-4「場所表記はチーム名(生の座席IDは出さない)」。レイアウトから名前を引けなかった時の
// 逃げ道もチーム名相当の語にする — ここで座席IDへフォールバックすると仕様違反が復活する
const UNKNOWN_TEAM_NAME = '別のチーム'

// §06-2/§07-2: 座席削除確認の内容。DeleteConfirmDialog(components/edit/、担当外)をそのまま
// 再利用するため、渡す2値だけをここで解決する。employeeNameがnullなら空席1席ケース、
// 非nullなら在席1席ケースへその側で振り分けられる(このオーバーレイのセル削除は常に単席のため
// 一括2席以上ケースは発生しない)
export type SeatDeleteConfirmContent = {
  employeeName: string | null
  department: string | null
}

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

export type UseOverlayEditWiringParams = {
  payload: TeamOverlayPayload | null
  seats: Seat[]
  employeeById: Map<string, Employee>
  seatGrid: SeatGrid
  editMode: UseOverlayEditModeResult
  seatSelection: UseSeatSelectionResult
  isCompactMobile: boolean
  // 追加直後の席までスクロールさせるための本文スクロール領域
  bodyRef: RefObject<HTMLDivElement | null>
  announce: (message: string) => void
  onClose: () => void
}

export type UseOverlayEditWiringResult = {
  handleSelectSeat: (seatId: string) => void
  handleAddSeat: (cell: GridCell) => void
  assignSeatId: string | null
  assignTargetSeat: Seat | null
  assignEmployees: Employee[]
  draftAppliedSeats: Seat[]
  // §06-4: このopenがヘッダーの「部署一括取込」から来たものならtrue。EmployeeAssignSheetの
  // initialBulkModeへそのまま渡す(消費側はassignSeatIdをkeyにして開くたびに再マウントさせる)
  assignInitialBulkMode: boolean
  handleAssignSeat: (seatId: string) => void
  handleAssignSelect: (employeeId: string) => void
  // §06-4 single: 確認が要る候補(空席×未配属以外)を選んだ時の口。確認を挟んでから適用する
  handleAssignSelectRequiringConfirm: (employeeId: string) => void
  // 確認ダイアログの内容。開いていなければnull
  assignConfirm: AssignConfirmContent | null
  confirmAssignSelect: () => void
  cancelAssignSelect: () => void
  handleAssignClear: () => void
  handleAssignClose: () => void
  bulkAssign: UseBulkAssignResult
  handleBulkAssignRequest: () => void
  // §06-4 bulk: チェックボックスで選んだ社員だけを配置する
  handleBulkAssignSelected: (employeeIds: string[]) => void
  // §06-4 bulk の入口(編集モードヘッダーの「部署一括取込」)。配属シートを開くだけ
  handleOpenBulkAssign: () => void
  canOpenBulkAssign: boolean
  // §06-2 座席モード: フリーアドレス設定の現在値(保存値に編集中の差分を重ねたもの)と切り替え口。
  // 保存値の出所はレイアウトの teams 1本で、ヘッダー側はこの2つを受け取るだけにする
  freeAddressEnabled: boolean
  toggleFreeAddress: () => void
  // §06-2/§07-2: 座席削除。requestSeatDeleteはEditSeatCellの削除ボタン(aria-label='座席を削除')
  // からContext経由で呼ばれる。requestSeatDeleteAtCellはゴミ箱投下(マウス/タッチ共通)がセルしか
  // 知らないための橋渡しで、セルから座席idを解決してから同じ確認経路に合流させる
  requestSeatDelete: (seatId: string) => void
  requestSeatDeleteAtCell: (cell: GridCell) => void
  // 確認待ちの座席の表示用情報。開いていなければnull
  seatDeleteConfirm: SeatDeleteConfirmContent | null
  confirmSeatDelete: () => void
  cancelSeatDelete: () => void
  seatCommit: UseSeatCommitResult
  handleSaveEdit: () => void
  handleCancelEdit: () => void
  // §06-6 チーム削除(オーバーレイのフッター)。タイプ確認モーダルを挟んでから team-delete する
  isTeamDeleteConfirmOpen: boolean
  requestTeamDelete: () => void
  confirmTeamDelete: () => void
  cancelTeamDelete: () => void
  // 未保存の変更があるか。編集ドックの保存可否と閉じる確認が同じこの1本を見る
  hasEditChanges: boolean
  // 編集中に閉じようとした時の破棄確認。開いている間だけ確認ダイアログを描く
  isDiscardConfirmOpen: boolean
  confirmDiscardClose: () => void
  cancelDiscardClose: () => void
  // 閉じる口。✕・背景・Esc・下スワイプの全経路がこれを通る
  guardedClose: () => void
}

export const useOverlayEditWiring = ({
  payload,
  seats,
  employeeById,
  seatGrid,
  editMode,
  seatSelection,
  isCompactMobile,
  bodyRef,
  announce,
  onClose,
}: UseOverlayEditWiringParams): UseOverlayEditWiringResult => {
  // STEP B5: 空セルからの席追加。仮IDの採番はuseSeatDraftState.addSeatに一本化し、ここでは
  // 採番しない。置いた直後は選択状態(既存のis-selected見せ方)をハイライト代わりに流用する
  const [justAddedSeatId, setJustAddedSeatId] = useState<string | null>(null)

  // useEffect/useCallbackの依存配列にメンバー式(seatSelection.xxx)をそのまま書くとlintが
  // 親オブジェクト自体の追跡を求めてくるため、使う関数だけ先に取り出しておく
  const { selectSeat, isSeatSelected, clearSelection } = seatSelection

  // STEP C1: 席の再タップで選択解除できるようにする。selectSeat自体は「常にその席を選ぶ」だけで
  // トグルではないため、ここでclearSelectionへ差し替える
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

  // STEP C4: 検索シート・一括配置へ渡す「全座席」は下書き反映済みのものに統一する。base(seats)の
  // ままだと同一セッション内の配属がシートから見えず、「今どこに座っているか」の判定が保存済みの
  // 席を指し続けて同じ人を複数席へ重複配置できてしまう。判定基準を二重に持たないよう、
  // 一括配置(useBulkAssign)側にも同じ配列を渡す
  const draftAppliedSeats = useDraftAppliedSeats(seats, editMode.draft)

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

  // §07-4 の「場所表記はチーム名」を満たすためのチームid→名前。保存済みレイアウトの teams が
  // 唯一の名前の出所で、ここで座席IDから接頭辞を切り出すような二つ目の判定基準は作らない
  const { layout } = useSeatLayout()
  const teamNameById = useMemo(
    () => new Map((layout?.teams ?? []).map((team) => [team.id, team.name])),
    [layout]
  )

  // §06-2: フリーアドレス設定の保存値。teamNameById と同じく保存済みレイアウトの teams が
  // 唯一の出所で、既定値(false)の穴埋めは lib/layout-persistence.ts の loadStoredLayout が
  // 済ませている。ここでは読めなかった時(種データ由来でキーを持たない)だけ false へ倒す
  const savedFreeAddressEnabled = useMemo(
    () => (layout?.teams ?? []).find((team) => team.id === payload?.teamId)?.freeAddressEnabled ?? false,
    [layout, payload]
  )

  const { resolveFreeAddressEnabled, toggleFreeAddress: toggleDraftFreeAddress } = editMode.draft
  const freeAddressEnabled = resolveFreeAddressEnabled(savedFreeAddressEnabled)
  const toggleFreeAddress = useCallback(
    () => toggleDraftFreeAddress(savedFreeAddressEnabled),
    [toggleDraftFreeAddress, savedFreeAddressEnabled]
  )

  // §06-2/§07-2: 座席削除。確認待ちの座席idをここに置いている間だけ確認モーダルを描く。
  // オーバーレイのセル削除は常に単席(§05-4のような複数選択は無い)なので一括ケースは扱わない
  const [deleteRequestSeatId, setDeleteRequestSeatId] = useState<string | null>(null)

  const requestSeatDelete = useCallback((seatId: string) => setDeleteRequestSeatId(seatId), [])

  // ゴミ箱投下(マウス/タッチ共通)はセルしか知らないため、ここでgridの生セル行列
  // (editMode.grid.cells、use-overlay-edit-mode.tsのremoveSeatAtCell内部と同じ読み方)から
  // 座席idを解決してからrequestSeatDeleteへ合流させる。判定基準を二重に作らないよう、
  // グリッド本体の唯一の読み出し口(cells行列)をここでもそのまま使う
  const requestSeatDeleteAtCell = useCallback(
    (cell: GridCell) => {
      const seatId = editMode.grid?.cells[cell.row]?.[cell.col] ?? null
      if (seatId) requestSeatDelete(seatId)
    },
    [editMode.grid, requestSeatDelete]
  )

  // §07-2: 表示用の氏名・部署。部署はEmployee.team(実物のディレクトリツリーのグルーピングに
  // 使う部署名文字列、types/index.ts参照)をそのまま使う — seat.teamIdは座席が今属している
  // チーム(=このオーバーレイ自身)であり、社員個人の部署とは別概念のため使わない
  const seatDeleteConfirm = useMemo<SeatDeleteConfirmContent | null>(() => {
    if (!deleteRequestSeatId) return null
    const seat = draftAppliedSeats.find((s) => s.id === deleteRequestSeatId)
    if (!seat) return null
    const employee = seat.employeeId ? employeeById.get(seat.employeeId) ?? null : null
    return { employeeName: employee ? employee.name : null, department: employee ? employee.team : null }
  }, [deleteRequestSeatId, draftAppliedSeats, employeeById])

  // §07-2 2段階削除: 在席1席は配属解除だけ(グリッドのセルはそのまま=形状不変)。
  // 空席1席はグリッドから席そのものを取り除く。セル位置は下書き反映済みのseatGrid
  // (assignSeatTargetと同じ引き方)から引く
  const confirmSeatDelete = useCallback(() => {
    if (!deleteRequestSeatId) return
    const seat = draftAppliedSeats.find((s) => s.id === deleteRequestSeatId)
    if (seat && seat.employeeId !== null) {
      editMode.draft.assignEmployee(deleteRequestSeatId, null)
    } else {
      const positioned = seatGrid.positionedSeats.find((p) => p.seat.id === deleteRequestSeatId)
      if (positioned) editMode.removeSeatAtCell({ row: positioned.row, col: positioned.col })
    }
    setDeleteRequestSeatId(null)
  }, [deleteRequestSeatId, draftAppliedSeats, editMode, seatGrid])

  const cancelSeatDelete = useCallback(() => setDeleteRequestSeatId(null), [])

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
    if (!justAddedSeatId) return
    // 選択が追加直後の席から移ったらフラグ自体を落とす。残したままだと、後で同じ席を選び直した
    // だけでこのeffectが再起動し、追加とは無関係な選択を自動解除してしまう
    if (!isSeatSelected(justAddedSeatId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJustAddedSeatId(null)
      return
    }
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
  }, [justAddedSeatId, isCompactMobile, isSeatSelected, clearSelection, bodyRef])

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
    void seatCommit.commit().then((result) => {
      editMode.cancel()
      // §06-5: 重複配属を畳んだ時は警告を優先する。トーストは1本しか出せない(後勝ちで上書き
      // される)ため、成功と警告を続けて流さず、どちらか一方だけを出す
      const dedupeWarnings = result.dedupedEmployeeIds.map((employeeId) =>
        TOAST_MESSAGES.ASSIGN_DEDUPED.replace('{name}', employeeById.get(employeeId)?.name ?? employeeId)
      )
      if (dedupeWarnings.length > 0) {
        announce(`[warning]${dedupeWarnings.join(' ')}`)
        return
      }
      announce(`[success]${TOAST_MESSAGES.SAVE_SUCCESS}`)
    })
  }, [seatCommit, editMode, announce, employeeById])

  // 取消(破棄)。ドックのキャンセルボタンとヘッダーの「終了」ボタンの両方から呼ぶ唯一の経路。
  // editMode.cancelは既に確定保存された内容までは打ち消さない(grid/draft/isEditModeの後始末のみ)ため、
  // 確認は挟まない
  const handleCancelEdit = useCallback(() => {
    editMode.cancel()
    announce('[info]編集をキャンセルしました')
  }, [editMode, announce])

  // 指摘#14: 保存可否と破棄確認の要否は同じ判定を使う。判定式自体はuseSeatCommit.hasChangesに
  // 一本化した(use-seat-commit.tsのcommit早期returnと同じ式をここで再定義しない)。
  // ここはそれを消費するだけ
  const hasEditChanges = seatCommit.hasChanges

  // 編集中に閉じる操作が来た時の破棄確認。開いている間だけ確認ダイアログを出す
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false)

  // ✕・背景・Esc・下スワイプの唯一の閉じる口。編集中でも閉じられるが、未保存の変更が
  // あるときだけ破棄確認を挟む(無言で捨てない)。変更が無ければそのまま編集モードを畳んで閉じる。
  // 指摘#11: depsをeditMode全体ではなくeditMode.isEditMode/editMode.cancelに絞る。editMode
  // (use-overlay-edit-mode.tsの戻り値)はdraftが毎レンダー新規オブジェクトのためオブジェクト
  // 全体としては完全には安定しない。ここで実際に使うのはisEditMode(値比較)とcancel
  // (use-overlay-edit-mode.ts側でdraft.clearDraftに絞られ恒常的に安定)の2つだけなので、
  // 個別フィールドに絞ってguardedClose自体の参照を安定させ、useModalShellのwindow keydown
  // リスナーが毎レンダー再登録されるのを防ぐ
  const guardedClose = useCallback(() => {
    if (!editMode.isEditMode) {
      onClose()
      return
    }
    if (hasEditChanges) {
      setIsDiscardConfirmOpen(true)
      return
    }
    editMode.cancel()
    onClose()
  }, [editMode.isEditMode, editMode.cancel, hasEditChanges, onClose])

  const confirmDiscardClose = useCallback(() => {
    setIsDiscardConfirmOpen(false)
    editMode.cancel()
    announce('[info]編集を破棄して閉じました')
    onClose()
  }, [editMode, announce, onClose])

  const cancelDiscardClose = useCallback(() => setIsDiscardConfirmOpen(false), [])

  // §06-6 チーム削除。確定するとレイアウトからチームと所属座席が消えるため、オーバーレイ自体も
  // 一緒に閉じる(消えたチームの座席グリッドを開いたまま残さない)
  const [isTeamDeleteConfirmOpen, setIsTeamDeleteConfirmOpen] = useState(false)
  const requestTeamDelete = useCallback(() => setIsTeamDeleteConfirmOpen(true), [])
  const cancelTeamDelete = useCallback(() => setIsTeamDeleteConfirmOpen(false), [])

  const teamName = payload?.teamName ?? ''
  const confirmTeamDelete = useCallback(() => {
    if (seatCommit.isSaving) return
    setIsTeamDeleteConfirmOpen(false)
    void seatCommit.deleteTeam().then(() => {
      editMode.cancel()
      announce(`[success]${TOAST_MESSAGES.DELETE_TEAM_SUCCESS.replace('{name}', teamName)}`)
      onClose()
    })
  }, [seatCommit, editMode, announce, teamName, onClose])

  return {
    handleSelectSeat,
    handleAddSeat,
    assignSeatId,
    assignTargetSeat,
    assignEmployees,
    draftAppliedSeats,
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
    freeAddressEnabled,
    toggleFreeAddress,
    requestSeatDelete,
    requestSeatDeleteAtCell,
    seatDeleteConfirm,
    confirmSeatDelete,
    cancelSeatDelete,
    seatCommit,
    handleSaveEdit,
    handleCancelEdit,
    hasEditChanges,
    isDiscardConfirmOpen,
    confirmDiscardClose,
    cancelDiscardClose,
    isTeamDeleteConfirmOpen,
    requestTeamDelete,
    confirmTeamDelete,
    cancelTeamDelete,
    guardedClose,
  }
}
