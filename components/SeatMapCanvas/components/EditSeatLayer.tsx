import { SeatCard } from '@/components/SeatCard'
import type { Employee, PresenceStatus, SeatLayout } from '@/types'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Lod, LivePosition } from '../type'

// 07: 座席カードは編集モード中のみ描画(ドラッグ対象を可視化)。
// 閲覧モードは原本通り個人座席カードを描かず sr-only ミラーのみで表現する

type Props = {
  seats: SeatLayout['seats']
  employeeById: Map<string, Employee>
  presenceMap: Map<string, PresenceStatus>
  liveSeatPos: LivePosition | null
  editSelectedSeatId: string | null
  pulsingSeatId: string | null
  lod: Lod
  counterScale: number
  onSelect: (seatId: string) => void
  onEditPointerDown: (seatId: string, e: ReactPointerEvent) => void
}

export const EditSeatLayer = ({
  seats,
  employeeById,
  presenceMap,
  liveSeatPos,
  editSelectedSeatId,
  pulsingSeatId,
  lod,
  counterScale,
  onSelect,
  onEditPointerDown,
}: Props) => (
  <>
    {seats.map((seat) => {
      const emp = seat.employeeId ? employeeById.get(seat.employeeId) ?? null : null
      const status: PresenceStatus = emp ? presenceMap.get(emp.id) ?? 'present' : 'present'
      // ドラッグ中の座席はライブ座標を優先表示(確定はpointerup時に1回のみ)
      const displaySeat = liveSeatPos && liveSeatPos.id === seat.id ? { ...seat, x: liveSeatPos.x, y: liveSeatPos.y } : seat
      return (
        <SeatCard
          key={seat.id}
          seat={displaySeat}
          employee={emp}
          status={status}
          selected={seat.id === editSelectedSeatId}
          pulsing={seat.id === pulsingSeatId}
          lod={lod}
          counterScale={counterScale}
          onSelect={onSelect}
          isEditMode
          isEditDragging={liveSeatPos?.id === seat.id}
          onEditPointerDown={onEditPointerDown}
        />
      )
    })}
  </>
)
