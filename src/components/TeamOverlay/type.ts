import type { UseSeatDragResult } from './hooks/use-seat-drag'
import type { Rect } from '@/utils/layout/rect'
import type { GridCell, SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import type {
  Employee,
  MinimapArea,
  MinimapFurniture,
  PresenceStatus,
  Seat,
  TeamOverlayPayload,
} from '@/types'

// 矩形は utils/layout/rect.ts の定義をそのまま使う(同じ形を再宣言すると同概念の型が二重化する)
export type MinimapRect = Rect

export type TeamOverlayProps = {
  payload: TeamOverlayPayload | null
  seats: Seat[]
  employeeById: Map<string, Employee>
  presenceMap: Map<string, PresenceStatus>
  onClose: () => void
  onSeatClick: (seatId: string) => void
  highlightSeatId?: string | null
  onClearHighlight?: () => void
  // ミニマップ用。全て任意で、渡さなければミニマップ自体を描かない
  minimapAreas?: MinimapArea[]
  minimapFurniture?: MinimapFurniture[]
  minimapTeamArea?: MinimapArea | null
  minimapViewBox?: { width: number; height: number }
}

type PositionedSeat = {
  seat: Seat
  row: number
  col: number
}

export type SeatGrid = {
  // 行→列でソート済み。Compact はこれだけを map する
  positionedSeats: PositionedSeat[]
  // Desktop は row×col の全走査でここを引く
  seatByGridCell: Map<string, Seat>
  rows: number
  cols: number
  // 編集中だけ埋まる空セル一覧(表示時は常に空配列)。CompactSeatGrid が EmptyGridCell の描画に使う。
  // utils/seat-grid.ts の buildSeatGrid(座標クラスタリング側)は空セルを持たないため任意にしてある
  emptyCells?: GridCell[]
}

// 両グリッドが受け取る共通 props。描画・入力・スクロール戦略だけが別実装になる
export type SeatGridProps = {
  grid: SeatGrid
  employeeById: Map<string, Employee>
  presenceMap: Map<string, PresenceStatus>
  teamName: string
  teamColor: string
  loading: boolean
  highlightSeatId: string | null
  onSeatClick: (seatId: string) => void
  onClearHighlight?: () => void
  // STEP B1: 編集モード。true の間はカードが EditSeatCell / EmptyGridCell へ差し替わる
  isEditMode: boolean
  isSeatSelected: (seatId: string) => boolean
  onSelectSeat: (seatId: string) => void
  // STEP B2/B3: ドラッグ配線。isEditMode=falseの間は呼び出し側(各グリッド)が
  // スプレッドを止めるため、値自体は常に渡してよい(表示モードのDOMは変わらない)
  seatMouseDragProps: UseSeatDragResult['seatMouseDragProps']
  cellMouseDropProps: UseSeatDragResult['cellMouseDropProps']
  seatTouchProps: UseSeatDragResult['seatTouchProps']
  // §06-2: ドロップ先ハイライト用。use-seat-drag(担当外)が計算するhoverCellをそのまま渡す。
  // DesktopSeatGrid/CompactSeatGridは既にoptional(既定null)で受けているため、渡さない
  // 呼び出し元があっても壊れない
  hoverCell?: GridCell | null
  // STEP B4: グリッド編集の行・列増減。値自体は常に渡してよく、isEditMode=falseの間は
  // 呼び出し側(各グリッド)が描画自体をスキップする(ドラッグ配線と同じ方針)。
  // editGridは行・列の空判定(isRowEmpty/isColEmpty)にそのまま使う生のSeatGridDraft
  editGrid: SeatGridDraft | null
  onAddRow: (edge: 'top' | 'bottom') => void
  onAddCol: (edge: 'left' | 'right') => void
  onRemoveRow: (row: number) => void
  onRemoveCol: (col: number) => void
  // STEP B5: 空セルへ新規席を追加する。仮IDの採番は呼び出し側(use-seat-draft-state.addSeat)に
  // 任せ、ここでは新しい採番口を作らない
  onAddSeat: (cell: GridCell) => void
  // STEP C1: 選択中の席の操作ピル(登録/変更)から呼ばれる。実際に社員検索シートを開く処理は
  // STEP C2 が実装し、この段階では配線だけを用意する
  onAssignSeat: (seatId: string) => void
  // STEP D1: 選択中の席カードに出す回転グリップから呼ばれる。draft.rotateSeatをそのまま渡してよい
  onRotateSeat: (seatId: string, rotation: Seat['rotation']) => void
}

// 判定の土台になる座席2種。どちらも算出元は use-draft-applied-seats の1本で、
// この容れ物は自前で座席配列を組み立て直さない(同じ概念の判定基準を二重に作らないため)
export type SeatDraftSeatSources = {
  // 保存済みの全座席。差し引きゼロ(保存値と同じ値へ戻した)の判定に使う
  saved: Seat[]
  // 下書きを反映した全座席。社員が今どこに座っているかの解決に使う
  resolved: Seat[]
}

// 座席編集の下書き差分(use-seat-draft-state が返す容れ物)
export type SeatDraftState = {
  // 割当の差分。値 '' は「空席にした」、キーが無い(undefined)は「差分なし」
  assignmentsOverride: Map<string, string>
  // 下書きで追加した座席そのもの(仮 id 込み)
  addedSeats: Seat[]
  // 削除対象にした既存座席の id
  removedSeatIds: Set<string>
  // 回転の差分
  rotationOverrides: Map<string, Seat['rotation']>
  // STEP C3: 部署一括配置で移動させた席の対応。キーが移動先(一括配置がaddSeatで新設した席id)、
  // 値が元の座席id。移動先が削除されたり他人へ再割当されたりして社員がそこから外れる時、
  // 元の座席へ配属を戻す起点にする(記録しないと動かした人がどこにも居なくなる)
  moveOrigins: Map<string, string>
  // §06-3: 現在baseline(編集開始時のグリッド)からセル位置が動いている座席idの集合。
  // grid自体(セル配置)はこの容れ物の外(use-overlay-edit-mode)にあるため、baselineとの
  // 差分計算はそちら側の担当。ここはsyncMovedSeatIdsで渡された結果を持つだけ
  movedSeatIds: Set<string>
  // §06-2 座席モード: フリーアドレス設定(チーム属性 Team.freeAddressEnabled)の差分。
  // null は「差分なし」。座席ではなくチーム属性なので、上の座席差分とは別の容れ物で持つ
  freeAddressOverride: boolean | null
  // 差分の合計件数(4種の座席差分+グリッド移動席数+フリーアドレス変更なら1)。同じ席を
  // 何度いじっても Map/Set のサイズは1のまま増えない
  changeCount: number
  // 割当の唯一の解決口。呼び出し側はここを通すだけで済み、
  // override ?? seat.employeeId のような '' 判定を各所に書かずに済む
  resolveEffectiveEmployeeId: (seatId: string, savedEmployeeId: string | null) => string | null
  // 座席追加。id は呼ばず、この場で採番して返す
  addSeat: (seat: Omit<Seat, 'id'>) => Seat
  // 座席削除。下書き追加した席そのものを消す場合は追加自体を取り消す(未確定の番号を無駄にしない)
  removeSeat: (seatId: string) => void
  // 割当変更。employeeId が null なら空席化。その社員が既に他の席に居るなら、
  // 保存時のリデューサー(seat-assign-employee)と同じ規則で元席を空けてから入れる
  assignEmployee: (seatId: string, employeeId: string | null) => void
  // 回転変更
  rotateSeat: (seatId: string, rotation: Seat['rotation']) => void
  // §06-2: フリーアドレス設定の現在値。保存値を引数で受けるのは resolveEffectiveEmployeeId と
  // 同じ理由 — 保存済みチームを知っているのは呼び出し側で、ここに2つ目の出所を作らない
  resolveFreeAddressEnabled: (savedFreeAddressEnabled: boolean) => boolean
  // §06-2: フリーアドレス設定の切り替え。保存値と同じ値へ戻ったら差分を落とす
  // (割当・回転と同じ規則。行き来しただけの差し引きゼロを「変更あり」で残さない)
  toggleFreeAddress: (savedFreeAddressEnabled: boolean) => void
  // 判定の土台(保存済み・下書き反映後の全座席)を受け取る唯一の口。use-draft-applied-seats が
  // 算出したものを毎レンダー渡す。渡らない間は元席の空席化・差し引きゼロ判定が働かないだけで、
  // 差分の記録そのものは従来どおり動く
  syncSeatSources: (sources: SeatDraftSeatSources) => void
  // STEP C3: 移動先(destSeatId)と元の座席(originSeatId)の対応を記録する。
  // 一括配置がaddSeatで新設した席にだけ呼ぶ想定で、既存席を移動先にはしない
  recordMoveOrigin: (destSeatId: string, originSeatId: string) => void
  // §06-3: movedSeatIdsの唯一の書き込み口。syncSeatSourcesと同じ「外で計算済みの値を渡すだけの
  // 受け口」方針だが、こちらはchangeCount(=描画)に使うためrefではなくstateで持つ。
  // 呼び出し側(baselineグリッドと現在グリッドを両方持つuse-overlay-edit-mode、担当外)が
  // レンダー毎に「今baselineから動いている座席id集合」を渡す想定
  syncMovedSeatIds: (ids: Set<string>) => void
  // 差分を全て破棄する
  clearDraft: () => void
}
