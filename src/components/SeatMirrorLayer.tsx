import { useRef, useState } from 'react'
import type { Employee, Seat, Team } from '@/types'

// 11: 原本のキャンバスは個人座席カードを描かない。座席は sr-only ミラー層にのみ存在し、
// キーボード/スクリーンリーダー経路(roving tabindex)で全座席へ到達できるようにする。
// 05-3: 編集セッション中はこの層が唯一のキャンバス側の座席選択入口になる
// (Shift+クリック=トグル / 通常クリック=単独選択)
type Props = {
  seats: Seat[]
  employeeById: Map<string, Employee>
  teams: Team[]
  // 編集セッション中のみ渡す。渡された時だけボタンをトグル(aria-pressed)として扱う
  selectedSeatIds?: readonly string[]
  onSelect: (seatId: string, toggle: boolean) => void
}

export const SeatMirrorLayer = ({ seats, employeeById, teams, selectedSeatIds, onSelect }: Props) => {
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
            aria-pressed={selectedSeatIds ? selectedSeatIds.includes(seat.id) : undefined}
            onFocus={() => setActiveIndex(index)}
            onKeyDown={(e) => onKeyDown(e, index)}
            // キャンバス余白のクリック(選択解除)へ伝播させない。止めないと選んだ直後に解除される
            onClick={(e) => {
              e.stopPropagation()
              onSelect(seat.id, e.shiftKey)
            }}
          />
        )
      })}
    </div>
  )
}
