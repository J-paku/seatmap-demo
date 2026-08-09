// 座席を1つ指定して「その座席が属するチームのオーバーレイを開き、その座席をヒット表示する」経路。
// ディレクトリ検索と「自分の席」ボタンの唯一の入口であり、分岐は呼び出し側だけに置く(引数は Seat 1つ)
import { useCallback, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import type { SeatMapCanvasHandle } from '@/components/SeatMapCanvas'
import type { TeamOverlayPayload } from '@/components/TeamOverlay'
import { useTeamColorMap } from '@/hooks/use-team-color-map'
import type { Seat, SeatLayout } from '@/types'
import { buildTeamOverlayPayload } from '@/utils/team-overlay-payload'

// 座席は解決できたがチーム箱を測れなかった場合の理由。呼び出し側が通知文言を決める
export type FocusFailure = 'no-seat' | 'no-team'

type Options = {
  layout: SeatLayout | null | undefined
  canvasRef: RefObject<SeatMapCanvasHandle | null>
  onFailure: (reason: FocusFailure) => void
}

type TeamSeatFocus = {
  payload: TeamOverlayPayload | null
  highlightSeatId: string | null
  focusSeat: (seat: Seat) => void
  close: () => void
  clearHighlight: () => void
  openByBoundary: (payload: TeamOverlayPayload) => void
}

export const useTeamSeatFocus = ({ layout, canvasRef, onFailure }: Options): TeamSeatFocus => {
  const teamColorMap = useTeamColorMap()
  const [payload, setPayload] = useState<TeamOverlayPayload | null>(null)
  const [highlightSeatId, setHighlightSeatId] = useState<string | null>(null)

  const focusSeat = useCallback(
    (seat: Seat) => {
      // レイアウト未取得・id 空の座席は移動先を決められないので座席未設定として扱う
      if (!seat.id || !layout) {
        onFailure('no-seat')
        return
      }
      // 所属判定は seat.teamId 一本。TeamOverlay 側の絞り込みと同じ基準を使う
      const team = layout.teams.find((candidate) => candidate.id === seat.teamId)
      const rect = team ? canvasRef.current?.measureTeamRect(team.idPrefix) ?? null : null
      if (!team || !rect) {
        onFailure('no-team')
        return
      }
      const next = buildTeamOverlayPayload(layout.teams, teamColorMap, team.id, rect)
      if (!next) {
        onFailure('no-team')
        return
      }
      setPayload(next)
      setHighlightSeatId(seat.id)
    },
    [layout, canvasRef, teamColorMap, onFailure]
  )

  const close = useCallback(() => {
    setPayload(null)
    setHighlightSeatId(null)
  }, [])

  const clearHighlight = useCallback(() => setHighlightSeatId(null), [])

  // バウンダリのタップで開く経路。こちらはヒット表示を伴わない
  const openByBoundary = useCallback((next: TeamOverlayPayload) => {
    setPayload(next)
    setHighlightSeatId(null)
  }, [])

  return useMemo(
    () => ({ payload, highlightSeatId, focusSeat, close, clearHighlight, openByBoundary }),
    [payload, highlightSeatId, focusSeat, close, clearHighlight, openByBoundary]
  )
}
