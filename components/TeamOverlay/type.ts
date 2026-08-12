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
