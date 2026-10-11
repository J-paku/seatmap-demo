// オフスクリーンチーム検知・エッジインジケーター位置算出フック
// 再計算はジェスチャー終了時の transformSnap 更新に同期する(rAF 購読はしない)
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import type { Facility, Seat, Team } from '@/types'
import type { Transform } from '@/utils/layout/geometry'

type Edge = 'left' | 'right' | 'top' | 'bottom'

// エッジインジケーターの画面座標(コンテナ相対)
export type OffscreenPingPos = {
  x: number
  y: number
  edge: Edge
}

type UseOffscreenTeamIndicatorResult = {
  nearestTeam: Team | null
  pingPos: OffscreenPingPos | null
  goToNearestTeam: () => void
}

// 辺の接線方向のはみ出しを抑えるクランプ幅
const PAD = 24

// 全チームエリアがビューポート外のとき、最近傍チームへのエッジタグ位置を返す
export const useOffscreenTeamIndicator = (
  containerRef: RefObject<HTMLDivElement | null>,
  transformSnap: Transform,
  teams: Team[],
  seats: Seat[],
  facilities: Facility[],
  animateTo: (target: Transform) => void,
  announce: (message: string) => void
): UseOffscreenTeamIndicatorResult => {
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

  // コンテナリサイズ監視(初回マウント時のみ登録)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setContainerSize({ w: r.width, h: r.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [containerRef])

  const { nearestTeam, pingPos } = useMemo(() => {
    const none = { nearestTeam: null as Team | null, pingPos: null as OffscreenPingPos | null }
    if (containerSize.w === 0 || teams.length === 0) return none

    const { scale, translateX, translateY } = transformSnap
    const cw = containerSize.w
    const ch = containerSize.h
    // ビューポートの論理座標範囲(スクリーン→論理の逆変換)
    const vpLeft = -translateX / scale
    const vpTop = -translateY / scale
    const vpRight = (cw - translateX) / scale
    const vpBottom = (ch - translateY) / scale
    const vpCenterX = (vpLeft + vpRight) / 2
    const vpCenterY = (vpTop + vpBottom) / 2

    // 会議室・ブース等が見えている間は出さない(aisle=通路は判定から除外 — 全域に敷かれているため)
    for (const fac of facilities) {
      if (fac.kind === 'aisle') continue
      if (
        fac.x < vpRight &&
        fac.x + fac.width > vpLeft &&
        fac.y < vpBottom &&
        fac.y + fac.height > vpTop
      ) {
        return none
      }
    }

    let visible = false
    let minDistSq = Infinity
    let nearest: Team | null = null

    for (const team of teams) {
      const { x, y, w, h } = team.area
      // チームエリアとビューポートの交差判定
      if (x < vpRight && x + w > vpLeft && y < vpBottom && y + h > vpTop) {
        visible = true
      }
      // ビューポート中心から各エリア中心への距離二乗(sqrt 不要)
      const distSq = (x + w / 2 - vpCenterX) ** 2 + (y + h / 2 - vpCenterY) ** 2
      if (distSq < minDistSq) {
        minDistSq = distSq
        nearest = team
      }
    }

    if (visible || !nearest) return none
    // コールバック内で null 縮小が効くよう確定参照へ移す
    const found = nearest

    // アンカー = 最近傍チーム内でビューポート中心に最も近い座席(無ければエリア中心)。
    // 所属判定の正本は seat.teamId(idPrefix 判定は禁止 — types/index.ts の注記)
    const anchorSeat = seats
      .filter((seat) => seat.teamId === found.id)
      .reduce<Seat | null>((closest, seat) => {
        if (!closest) return seat
        const seatDist =
          (seat.x + seat.width / 2 - vpCenterX) ** 2 + (seat.y + seat.height / 2 - vpCenterY) ** 2
        const closestDist =
          (closest.x + closest.width / 2 - vpCenterX) ** 2 +
          (closest.y + closest.height / 2 - vpCenterY) ** 2
        return seatDist < closestDist ? seat : closest
      }, null)

    const anchorWorldX = anchorSeat
      ? anchorSeat.x + anchorSeat.width / 2
      : found.area.x + found.area.w / 2
    const anchorWorldY = anchorSeat
      ? anchorSeat.y + anchorSeat.height / 2
      : found.area.y + found.area.h / 2
    // 論理→スクリーン変換してコンテナ中心からの方向ベクトルを取る
    const dx = anchorWorldX * scale + translateX - cw / 2
    const dy = anchorWorldY * scale + translateY - ch / 2
    const halfW = cw / 2
    const halfH = ch / 2
    const absDx = Math.abs(dx) || 0.001
    const absDy = Math.abs(dy) || 0.001
    // 縦横どちらの辺に先に当たるかでエッジを決定
    const hitHEdge = absDx / halfW > absDy / halfH
    const t = hitHEdge ? halfW / absDx : halfH / absDy
    const edge: Edge = hitHEdge ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'bottom' : 'top'

    return {
      nearestTeam: found,
      pingPos: {
        x: Math.max(PAD, Math.min(cw - PAD, cw / 2 + dx * t)),
        y: Math.max(PAD, Math.min(ch - PAD, ch / 2 + dy * t)),
        edge,
      },
    }
  }, [transformSnap, teams, seats, facilities, containerSize])

  // 最近傍チームエリア中心へカメラをアニメーション移動(scale 維持)
  const goToNearestTeam = useCallback(() => {
    if (!nearestTeam) return
    const { w: cw, h: ch } = containerSize
    if (cw === 0 || ch === 0) return
    const cx = nearestTeam.area.x + nearestTeam.area.w / 2
    const cy = nearestTeam.area.y + nearestTeam.area.h / 2
    const { scale } = transformSnap
    animateTo({ scale, translateX: cw / 2 - cx * scale, translateY: ch / 2 - cy * scale })
    announce(`チーム ${nearestTeam.name} へ移動しました`)
  }, [nearestTeam, containerSize, transformSnap, animateTo, announce])

  return { nearestTeam, pingPos, goToNearestTeam }
}
