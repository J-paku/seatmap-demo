import { useCallback, useMemo } from 'react'
import type { RefObject } from 'react'
import { useTeamSeatFocus } from './use-team-seat-focus'
import type { SurfaceState } from './use-surface-state'
import type { TeamSeatFocus } from './use-team-seat-focus'
import type { FocusFailure } from '../type'
import { focusFailureMessage } from '../utils/compose-notice-message'
import { seatOfEmployee } from '../utils/find-employee-seat'
import type { SeatMapCanvasHandle } from '@/components/SeatMapCanvas'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'
import type { Employee, Seat, SeatLayout } from '@/types'

// 人から座席へ飛ぶ導線。サイドバーの社員 → 人物カード →「座席へ移動」と、「自分の席」ボタン。
// どの席へ飛ぶかの引き当てと、飛べなかったときの通知をここで持つ(飛ぶ本体は useTeamSeatFocus)

type Options = {
  effectiveLayout: SeatLayout | undefined
  canvasRef: RefObject<SeatMapCanvasHandle | null>
  showNotice: (message: string) => void
  // 「座席へ移動」で飛ぶ前にサイドバーを畳む
  surface: Pick<SurfaceState, 'setIsDirectoryOpen'>
}

export type SeatNavigation = {
  focus: TeamSeatFocus
  personSeat: Seat | null
  handleDirectoryEmployeeSelect: (employee: Employee) => void
  handleGoToSeat: () => void
  handleGoToMySeat: () => void
}

export const useSeatNavigation = ({
  effectiveLayout,
  canvasRef,
  showNotice,
  surface: { setIsDirectoryOpen },
}: Options): SeatNavigation => {
  const { openPersonDetail, personDetailId, closeAll } = useDetailPanel()

  const handleFocusFailure = useCallback(
    (reason: FocusFailure) => {
      showNotice(focusFailureMessage(reason))
    },
    [showNotice]
  )

  // 10: チームバウンダリのタップ、および検索・自分の席からのヒット表示を束ねる
  const focus = useTeamSeatFocus({
    layout: effectiveLayout,
    canvasRef,
    onFailure: handleFocusFailure,
  })

  // サイドバーで押された社員はまずカードで見せる。座席へ飛ぶかどうかはカードのCTAが決める
  const handleDirectoryEmployeeSelect = useCallback(
    (employee: Employee) => {
      openPersonDetail(employee.id)
    },
    [openPersonDetail]
  )

  // 人物詳細を開いている社員の席。引けない社員にはCTAを出さず「座席未設定」を見せる
  const personSeat = useMemo(
    () => seatOfEmployee(effectiveLayout, personDetailId),
    [personDetailId, effectiveLayout]
  )

  // カードの「座席へ移動」。畳んでから飛ばす — 逆順だとオーバーレイの上にシートの暗幕が残る
  const handleGoToSeat = useCallback(() => {
    if (!personSeat) return
    closeAll()
    setIsDirectoryOpen(false)
    focus.focusSeat(personSeat)
  }, [personSeat, closeAll, focus.focusSeat, setIsDirectoryOpen])

  // 「自分の席」ボタン。検索と同じ focusSeat を通し、分岐はここ(席の引き当て)だけに持つ
  const handleGoToMySeat = useCallback(() => {
    const seat = seatOfEmployee(effectiveLayout, SELF_EMPLOYEE_ID)
    if (!seat) {
      showNotice('座席未設定')
      return
    }
    focus.focusSeat(seat)
  }, [effectiveLayout, focus.focusSeat, showNotice])

  return { focus, personSeat, handleDirectoryEmployeeSelect, handleGoToSeat, handleGoToMySeat }
}
