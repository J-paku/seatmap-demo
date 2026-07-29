import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useSeats } from '@/lib/mock-loader'

// 03: 詳細パネル開き状態(全て null=閉)
export type DetailPanelState = {
  seatDetailId: string | null
  facilityDetailId: string | null
  scheduleDetailId: string | null
}

type DetailPanelApi = DetailPanelState & {
  openSeatDetail: (seatId: string) => void
  openFacilityDetail: (facilityId: string) => void
  openScheduleDetail: (eventId: string) => void
  switchToEmployee: (employeeId: string) => void
  closeTop: () => void
  closeAll: () => void
}

const EMPTY: DetailPanelState = { seatDetailId: null, facilityDetailId: null, scheduleDetailId: null }

const Ctx = createContext<DetailPanelApi | null>(null)

export const DetailPanelProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DetailPanelState>(EMPTY)
  const { data: seats } = useSeats()

  const openSeatDetail = useCallback((seatId: string) => {
    setState({ seatDetailId: seatId, facilityDetailId: null, scheduleDetailId: null })
  }, [])

  const openFacilityDetail = useCallback((facilityId: string) => {
    setState({ seatDetailId: null, facilityDetailId: facilityId, scheduleDetailId: null })
  }, [])

  const openScheduleDetail = useCallback((eventId: string) => {
    // 社員詳細を維持したままスタック
    setState((s) => (s.seatDetailId ? { ...s, scheduleDetailId: eventId } : s))
  }, [])

  const switchToEmployee = useCallback(
    (employeeId: string) => {
      const seat = (seats ?? []).find((s) => s.employeeId === employeeId)
      if (!seat) return
      setState({ seatDetailId: seat.id, facilityDetailId: null, scheduleDetailId: null })
    },
    [seats]
  )

  const closeTop = useCallback(() => {
    setState((s) => (s.scheduleDetailId ? { ...s, scheduleDetailId: null } : EMPTY))
  }, [])

  const closeAll = useCallback(() => setState(EMPTY), [])

  const api = useMemo<DetailPanelApi>(
    () => ({ ...state, openSeatDetail, openFacilityDetail, openScheduleDetail, switchToEmployee, closeTop, closeAll }),
    [state, openSeatDetail, openFacilityDetail, openScheduleDetail, switchToEmployee, closeTop, closeAll]
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useDetailPanel = (): DetailPanelApi => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDetailPanel は DetailPanelProvider 内で使用すること')
  return v
}
