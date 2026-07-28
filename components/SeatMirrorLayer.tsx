import { useRef, useState } from 'react'
import type { Employee, Seat, Team } from '@/lib/types'

// 11: 原本のキャンバスは個人座席カードを描かない。座席は sr-only ミラー層にのみ存在し、
// キーボード/スクリーンリーダー経路(roving tabindex)で全座席へ到達できるようにする
type Props = {
  seats: Seat[]
  employeeById: Map<string, Employee>
  teams: Team[]
  onSelect: (seatId: string) => void
}

export const SeatMirrorLayer = ({ seats, employeeById, teams, onSelect }: Props) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([])

  const teamNameOf = (teamId: string) => teams.find((t) => t.id === teamId)?.name ?? ''

  const focusIndex = (index: number) => {
    if (seats.length === 0) return
    const next = (index + seats.length) % seats.length
    setActiveIndex(next)
    btnRefs.current[next]?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      focusIndex(index + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      focusIndex(index - 1)
    }
  }

  return (
    <div className='sr-only' role='group' aria-label='座席一覧'>
      {seats.map((seat, index) => {
        const employee = seat.employeeId ? employeeById.get(seat.employeeId) ?? null : null
        const label = employee ? `${employee.name}、${teamNameOf(seat.teamId)}` : '空席'
        return (
          <button
            key={seat.id}
            ref={(el) => {
              btnRefs.current[index] = el
            }}
            type='button'
            tabIndex={index === activeIndex ? 0 : -1}
            aria-label={label}
            onFocus={() => setActiveIndex(index)}
            onKeyDown={(e) => onKeyDown(e, index)}
            onClick={() => onSelect(seat.id)}
          />
        )
      })}
    </div>
  )
}
