import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// 03: 詳細パネル開き状態(全て null=閉)
// 社員カードへの入口は2経路。seatDetailId=座席から(インスペクター)、personDetailId=人から(人物詳細)
export type DetailPanelState = {
  seatDetailId: string | null
  personDetailId: string | null
  facilityDetailId: string | null
  scheduleDetailId: string | null
}

type DetailPanelApi = DetailPanelState & {
  openSeatDetail: (seatId: string) => void
  openPersonDetail: (employeeId: string) => void
  openFacilityDetail: (facilityId: string) => void
  openScheduleDetail: (eventId: string) => void
  switchToEmployee: (employeeId: string) => void
  closeTop: () => void
  closeAll: () => void
}

const EMPTY: DetailPanelState = {
  seatDetailId: null,
  personDetailId: null,
  facilityDetailId: null,
  scheduleDetailId: null,
}

const Ctx = createContext<DetailPanelApi | null>(null)

export const DetailPanelProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DetailPanelState>(EMPTY)

  // 2経路が同時に立たないよう、開く側が必ず相手を null にする
  const openSeatDetail = useCallback((seatId: string) => {
    setState({ ...EMPTY, seatDetailId: seatId })
  }, [])

  const openPersonDetail = useCallback((employeeId: string) => {
    setState({ ...EMPTY, personDetailId: employeeId })
  }, [])

  const openFacilityDetail = useCallback((facilityId: string) => {
    setState({ ...EMPTY, facilityDetailId: facilityId })
  }, [])

  const openScheduleDetail = useCallback((eventId: string) => {
    // 社員詳細を維持したままスタック(どちらの経路で開いていても同じ)
    setState((s) => (s.seatDetailId || s.personDetailId ? { ...s, scheduleDetailId: eventId } : s))
  }, [])

  // 席の有無に関わらず開けるようになったため、座席を引く分岐は持たない
  const switchToEmployee = openPersonDetail

  const closeTop = useCallback(() => {
    setState((s) => (s.scheduleDetailId ? { ...s, scheduleDetailId: null } : EMPTY))
  }, [])

  const closeAll = useCallback(() => setState(EMPTY), [])

  const api = useMemo<DetailPanelApi>(
    () => ({
      ...state,
      openSeatDetail,
      openPersonDetail,
      openFacilityDetail,
      openScheduleDetail,
      switchToEmployee,
      closeTop,
      closeAll,
    }),
    [
      state,
      openSeatDetail,
      openPersonDetail,
      openFacilityDetail,
      openScheduleDetail,
      switchToEmployee,
      closeTop,
      closeAll,
    ]
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useDetailPanel = (): DetailPanelApi => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDetailPanel は DetailPanelProvider 内で使用すること')
  return v
}
