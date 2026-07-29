import type { Employee, PresenceStatus, Seat } from '@/lib/types'

// チームバウンダリのクリックで渡ってくる情報。rect が拡大の原点になる
export type TeamOverlayPayload = {
  teamId: string
  teamName: string
  teamColor: string
  rect: DOMRect
}

export type TeamOverlayProps = {
  payload: TeamOverlayPayload | null
  seats: Seat[]
  employeeById: Map<string, Employee>
  presenceMap: Map<string, PresenceStatus>
  onClose: () => void
  onSeatClick: (seatId: string) => void
  highlightSeatId?: string | null
  onClearHighlight?: () => void
}

export type PositionedSeat = {
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
}
