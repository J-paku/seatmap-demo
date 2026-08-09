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

// 03: パネルの重なり順(下→上)。DetailPanels の描画順・スタック CSS(stackTop/stackSchedule)は
// この順で上へ重ねる。closeTop はこの配列を逆順に辿り、最初に開いている層だけを畳む(#15 単一ソース化)
const DETAIL_PANEL_LAYER_ORDER = ['facility', 'employee', 'schedule'] as const
type DetailPanelLayer = (typeof DETAIL_PANEL_LAYER_ORDER)[number]

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

// 層ごとの開閉判定と、畳む時に空にするフィールド。DETAIL_PANEL_LAYER_ORDER の要素ごとに1つ
type LayerRule = {
  isOpen: (s: DetailPanelState) => boolean
  close: (s: DetailPanelState) => DetailPanelState
}

const LAYER_RULES: Record<DetailPanelLayer, LayerRule> = {
  facility: {
    isOpen: (s) => s.facilityDetailId !== null,
    close: () => EMPTY,
  },
  employee: {
    isOpen: (s) => s.seatDetailId !== null || s.personDetailId !== null,
    close: (s) => ({ ...s, seatDetailId: null, personDetailId: null }),
  },
  schedule: {
    isOpen: (s) => s.scheduleDetailId !== null,
    close: (s) => ({ ...s, scheduleDetailId: null }),
  },
}

const Ctx = createContext<DetailPanelApi | null>(null)

export const DetailPanelProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DetailPanelState>(EMPTY)

  // 2経路が同時に立たないよう、開く側が必ず相手を null にする
  const openSeatDetail = useCallback((seatId: string) => {
    setState({ ...EMPTY, seatDetailId: seatId })
  }, [])

  // 施設詳細を開いたまま参加者カードを重ねる。施設を閉じてしまうと参加者を1人見るたびに
  // 会議室へ戻り直すことになるため、戻り先として施設だけは残す(他は従来どおり畳む)
  const openPersonDetail = useCallback((employeeId: string) => {
    setState((s) => ({ ...EMPTY, facilityDetailId: s.facilityDetailId, personDetailId: employeeId }))
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

  // DETAIL_PANEL_LAYER_ORDER を逆順(上から)に辿り、最初に開いている層だけを畳む。
  // 社員が施設の上に載っている時は社員だけを外し(施設は残る)、施設単独・社員単独は全部閉じる
  const closeTop = useCallback(() => {
    setState((s) => {
      for (const layer of [...DETAIL_PANEL_LAYER_ORDER].reverse()) {
        if (LAYER_RULES[layer].isOpen(s)) return LAYER_RULES[layer].close(s)
      }
      return s
    })
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
