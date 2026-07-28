import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { SeatCard } from './SeatCard'
import type { Lod } from './SeatCard'
import { TeamArea } from './TeamArea'
import type { TeamOverlayPayload } from './TeamOverlay'
import type { FacilityState } from '@/lib/facility-status'
import { FacilityBlock } from './FacilityBlock'
import { ZoomControls } from './ZoomControls'
import { SEATMAP_BG_ID } from './SheetShell'
import { AlignmentGuides } from './edit/AlignmentGuides'
import { SeatActionBar } from './edit/SeatActionBar'
import { UndoChip } from './edit/UndoChip'
import { useTeamColorMap, resolveTeamColor } from '@/lib/team-colors'
import type { Employee, PresenceStatus, Seat, SeatLayout } from '@/lib/types'
import {
  MAX_SCALE,
  clamp,
  computeCompact,
  computeMinScale,
  levelToScale,
  scaleToLevel,
  toLogical,
} from '@/lib/geometry'
import type { Transform } from '@/lib/geometry'
import { computeSnap, SNAP_THRESHOLD_SCREEN_PX } from '@/lib/snap-guides'
import type { SnapGuide } from '@/lib/snap-guides'
import { rectOf } from '@/lib/layout-actions'

// チーム毎の在席内訳(present/meeting/out/vacation)
export type TeamPresenceCounts = { present: number; meeting: number; out: number; vacation: number }

type Props = {
  layout: SeatLayout
  employeeById: Map<string, Employee>
  presenceMap: Map<string, PresenceStatus>
  // 06: チーム毎の在席内訳(present/meeting/out/vacation)。凡例の補助表示に使用
  teamPresenceCounts: Map<string, TeamPresenceCounts>
  onSeatSelect?: (seatId: string) => void
  onFacilitySelect?: (facilityId: string) => void
  // 10: チームバウンダリのタップで大型オーバーレイを開く(画面座標 rect を親へ渡す)
  onTeamBoundaryClick?: (payload: TeamOverlayPayload) => void
  // 会議室状態(facilityId → 状態)
  facilityStateById?: Map<string, FacilityState>
  // 07: 編集モード中のみ有効。未指定(閲覧モード)では以下の分岐へ一切到達しない
  isEditMode?: boolean
  onSeatMove?: (seatId: string, x: number, y: number) => void
  onTeamMove?: (teamId: string, x: number, y: number) => void
  onSeatEditSelect?: (seatId: string | null) => void
  onTeamLabelTap?: (teamId: string) => void
  onSeatChangeTeamRequest?: (seatId: string) => void
  onSeatDeleteRequest?: (seatId: string) => void
  onUndo?: () => void
  canUndo?: boolean
}

type Rect = { x: number; y: number; w: number; h: number }

// 06: 所属座席のバウンディングボックス→パディング20→中心維持で1.2倍→最小200×100 でクランプ
const deriveTeamArea = (seats: Seat[], fallback: Rect): Rect => {
  if (seats.length === 0) return fallback
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of seats) {
    minX = Math.min(minX, s.x)
    minY = Math.min(minY, s.y)
    maxX = Math.max(maxX, s.x + s.width)
    maxY = Math.max(maxY, s.y + s.height)
  }
  const padding = 20
  const px0 = minX - padding
  const py0 = minY - padding
  const px1 = maxX + padding
  const py1 = maxY + padding
  const cx = (px0 + px1) / 2
  const cy = (py0 + py1) / 2
  const w = (px1 - px0) * 1.2
  const h = (py1 - py0) * 1.2
  const clampedW = Math.max(w, 200)
  const clampedH = Math.max(h, 100)
  return {
    x: cx - clampedW / 2,
    y: cy - clampedH / 2,
    w: clampedW,
    h: clampedH,
  }
}

// 05: ディレクトリからの「座席へジャンプ」命令(親が ref 経由で呼び出す)
export type SeatMapCanvasHandle = {
  jumpToSeat: (seat: Seat, onArrive: () => void) => void
}

// パルス演出時間(通常/reduced-motion)
const PULSE_DURATION_MS = 2200
const PULSE_REDUCED_MS = 420

type Anim =
  | { kind: 'none' }
  | { kind: 'inertia'; vx: number; vy: number; frame: number }
  | { kind: 'lerp'; targetLevel: number; ax: number; ay: number; alx: number; aly: number }
  | { kind: 'bounce'; limit: number; ax: number; ay: number; alx: number; aly: number }

// モーダル表示中はキャンバス操作を無効化
const isModalOpen = () =>
  typeof document !== 'undefined' &&
  document.querySelector("[role='dialog'][aria-modal='true']") !== null

const lodOf = (scale: number): Lod =>
  scale >= 0.5 ? 'detail' : scale >= 0.3 ? 'mid' : 'overview'

export const SeatMapCanvas = forwardRef<SeatMapCanvasHandle, Props>(function SeatMapCanvas(
  {
    layout,
    employeeById,
    presenceMap,
    teamPresenceCounts,
    onSeatSelect,
    onFacilitySelect,
    onTeamBoundaryClick,
    facilityStateById,
    isEditMode,
    onSeatMove,
    onTeamMove,
    onSeatEditSelect,
    onTeamLabelTap,
    onSeatChangeTeamRequest,
    onSeatDeleteRequest,
    onUndo,
    canUndo,
  },
  ref
) {
  const teamColorMap = useTeamColorMap()
  const containerRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const transformRef = useRef<Transform>({ scale: 0.5, translateX: 0, translateY: 0 })
  const rectRef = useRef<DOMRect | null>(null)
  const minScaleRef = useRef(0.25)
  const mountedRef = useRef(false)
  const rafRef = useRef(0)
  const animRef = useRef<Anim>({ kind: 'none' })
  const pulseTimeoutRef = useRef(0)

  // ポインタ・パン・ピンチ状態(全て ref: 再レンダーを起こさない)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const panRef = useRef({ active: false, id: -1, lastX: 0, lastY: 0, startX: 0, startY: 0, moved: false })
  const pinchRef = useRef({ active: false, startDist: 0, startScale: 1, startTime: 0, alx: 0, aly: 0, midX: 0, midY: 0 })
  const velRef = useRef<Array<{ x: number; y: number; t: number }>>([])
  const lastTapRef = useRef({ t: 0, x: 0, y: 0, prevScale: 0 })
  const suppressClickRef = useRef(false)

  // LOD/カウンタ補正用スナップショット(ジェスチャ終了時のみ更新)
  const [scaleSnap, setScaleSnap] = useState(0.5)
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null)
  // 05: ディレクトリからのジャンプ着地時に強調パルスさせる座席
  const [pulsingSeatId, setPulsingSeatId] = useState<string | null>(null)
  // チームテーブルをクリックして展開中(=メンバー座席を表示する)チーム集合。ズーム段階とは無関係
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(() => new Set())

  // 07: 編集モード中のドラッグ状態(座席/チームラベル共用)。view モードでは常に不使用
  type EditDrag =
    | { kind: 'none' }
    | {
        kind: 'seat'
        seatId: string
        pointerId: number
        startScreenX: number
        startScreenY: number
        startLogicalX: number
        startLogicalY: number
        liveX: number
        liveY: number
        moved: boolean
      }
    | {
        kind: 'team'
        teamId: string
        pointerId: number
        startScreenX: number
        startScreenY: number
        startLogicalX: number
        startLogicalY: number
        liveX: number
        liveY: number
        moved: boolean
      }
  const editDragRef = useRef<EditDrag>({ kind: 'none' })
  // ライブ座標(ドラッグ中のみ描画反映。確定はpointerup時に親へ1回通知)
  const [liveSeatPos, setLiveSeatPos] = useState<{ id: string; x: number; y: number } | null>(null)
  const [liveTeamPos, setLiveTeamPos] = useState<{ id: string; x: number; y: number } | null>(null)
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([])
  // 07: 編集モード中に選択された座席1件(フローティングアクションバー表示用)
  const [editSelectedSeatId, setEditSelectedSeatId] = useState<string | null>(null)
  // 07: 「元に戻す」チップの表示位置(直前アクション対象直下)。次操作または5秒経過で消去
  const [undoChipPos, setUndoChipPos] = useState<{ x: number; y: number } | null>(null)
  const undoChipTimeoutRef = useRef(0)

  const rect = () => {
    if (!rectRef.current && containerRef.current) {
      rectRef.current = containerRef.current.getBoundingClientRect()
    }
    return rectRef.current
  }

  // 変換を DOM に直接適用(scale クランプは bounce 以外で有効)
  const applyTransform = useCallback((t: Transform, allowOverscroll = false) => {
    let s = t.scale
    if (!allowOverscroll) s = clamp(s, minScaleRef.current, MAX_SCALE)
    const next = { scale: s, translateX: t.translateX, translateY: t.translateY }
    transformRef.current = next
    const el = layerRef.current
    if (el) {
      el.style.transform = `translate3d(${next.translateX}px, ${next.translateY}px, 0) scale(${next.scale})`
    }
  }, [])

  const commitSnap = useCallback(() => {
    setScaleSnap(transformRef.current.scale)
  }, [])

  const cancelAnim = useCallback(() => {
    animRef.current = { kind: 'none' }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  // rAF ループ(inertia / lerp / bounce)
  const startLoop = useCallback(() => {
    if (rafRef.current) return
    let frame = 0
    const tick = () => {
      const anim = animRef.current
      const t = transformRef.current
      if (anim.kind === 'inertia') {
        let { vx, vy } = anim
        applyTransform({ scale: t.scale, translateX: t.translateX + vx, translateY: t.translateY + vy })
        vx *= 0.92
        vy *= 0.92
        frame++
        if (frame % 5 === 0) commitSnap()
        if (Math.hypot(vx, vy) < 1.5) {
          animRef.current = { kind: 'none' }
          commitSnap()
        } else {
          animRef.current = { ...anim, vx, vy }
        }
      } else if (anim.kind === 'lerp') {
        const curLevel = scaleToLevel(t.scale)
        const nextLevel = curLevel + (anim.targetLevel - curLevel) * 0.22
        const newScale = clamp(levelToScale(nextLevel), minScaleRef.current, MAX_SCALE)
        applyTransform({
          scale: newScale,
          translateX: anim.ax - anim.alx * newScale,
          translateY: anim.ay - anim.aly * newScale,
        })
        if (Math.abs(anim.targetLevel - scaleToLevel(newScale)) < 0.002) {
          animRef.current = { kind: 'none' }
          commitSnap()
        }
      } else if (anim.kind === 'bounce') {
        const newScale = t.scale + (anim.limit - t.scale) * 0.22
        applyTransform(
          {
            scale: newScale,
            translateX: anim.ax - anim.alx * newScale,
            translateY: anim.ay - anim.aly * newScale,
          },
          true
        )
        if (Math.abs(anim.limit - newScale) < 0.0005) {
          applyTransform({
            scale: anim.limit,
            translateX: anim.ax - anim.alx * anim.limit,
            translateY: anim.ay - anim.aly * anim.limit,
          })
          animRef.current = { kind: 'none' }
          commitSnap()
        }
      }
      if (animRef.current.kind === 'none') {
        rafRef.current = 0
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [applyTransform, commitSnap])

  // 基点固定の lerp ズーム(±level)
  const lerpZoom = useCallback(
    (deltaLevel: number, anchorX: number, anchorY: number) => {
      const t = transformRef.current
      const targetLevel = clamp(
        scaleToLevel(t.scale) + deltaLevel,
        scaleToLevel(minScaleRef.current),
        scaleToLevel(MAX_SCALE)
      )
      animRef.current = {
        kind: 'lerp',
        targetLevel,
        ax: anchorX,
        ay: anchorY,
        alx: toLogical(anchorX, t.scale, t.translateX),
        aly: toLogical(anchorY, t.scale, t.translateY),
      }
      startLoop()
    },
    [startLoop]
  )

  // 即時ズーム(トラックパッド・編手ズーム用)
  const immediateZoom = useCallback(
    (deltaLevel: number, anchorX: number, anchorY: number, overscroll = false) => {
      const t = transformRef.current
      const raw = levelToScale(scaleToLevel(t.scale) + deltaLevel)
      const s = overscroll ? raw : clamp(raw, minScaleRef.current, MAX_SCALE)
      const lx = toLogical(anchorX, t.scale, t.translateX)
      const ly = toLogical(anchorY, t.scale, t.translateY)
      applyTransform({ scale: s, translateX: anchorX - lx * s, translateY: anchorY - ly * s }, overscroll)
    },
    [applyTransform]
  )

  // 初期コンパクト変換(マウント1回のみ)
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || mountedRef.current) return
    const r = el.getBoundingClientRect()
    rectRef.current = r
    minScaleRef.current = computeMinScale(r.width, r.height)
    const compact = computeCompact(r.width, r.height)
    applyTransform(compact)
    setScaleSnap(compact.scale)
    mountedRef.current = true
  }, [applyTransform])

  // リサイズ: rect キャッシュのみ再計測(transform は維持)
  useEffect(() => {
    const onResize = () => {
      if (containerRef.current) rectRef.current = containerRef.current.getBoundingClientRect()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // キーボード ±level
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isModalOpen()) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const r = rect()
      if (!r) return
      const cx = r.width / 2
      const cy = r.height / 2
      if (e.key === '+' || e.key === '=') {
        cancelAnim()
        lerpZoom(1, cx, cy)
      } else if (e.key === '-' || e.key === '_') {
        cancelAnim()
        lerpZoom(-1, cx, cy)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancelAnim, lerpZoom])

  // ホイール/トラックパッドズーム(native passive:false 登録)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (isModalOpen()) return
      e.preventDefault()
      cancelAnim()
      const r = rect()
      if (!r) return
      const ax = e.clientX - r.left
      const ay = e.clientY - r.top
      if (e.ctrlKey) {
        // トラックパッドピンチ: 70px=1レベル 即時
        immediateZoom(-e.deltaY / 70, ax, ay)
        return
      }
      let delta = e.deltaY
      if (e.deltaMode === 1) delta *= 33 // 行スクロール換算
      delta = clamp(delta, -100, 100)
      lerpZoom(-delta / 100, ax, ay)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [cancelAnim, immediateZoom, lerpZoom])

  // ── ポインタ ─────────────────────────────

  const onPointerDown = (e: React.PointerEvent) => {
    if (isModalOpen()) return
    if (e.button === 2) return // 右クリック無視
    cancelAnim()
    const r = rect()
    if (!r) return
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    pointersRef.current.set(e.pointerId, { x, y })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    if (pointersRef.current.size === 2) {
      // ピンチ開始
      panRef.current.active = false
      const pts = [...pointersRef.current.values()]
      const midX = (pts[0].x + pts[1].x) / 2
      const midY = (pts[0].y + pts[1].y) / 2
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const t = transformRef.current
      pinchRef.current = {
        active: true,
        startDist: dist,
        startScale: t.scale,
        startTime: Date.now(),
        alx: toLogical(midX, t.scale, t.translateX),
        aly: toLogical(midY, t.scale, t.translateY),
        midX,
        midY,
      }
    } else if (pointersRef.current.size === 1) {
      panRef.current = { active: true, id: e.pointerId, lastX: x, lastY: y, startX: x, startY: y, moved: false }
      velRef.current = []
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointersRef.current.get(e.pointerId)
    if (!p) return
    const r = rect()
    if (!r) return
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    p.x = x
    p.y = y

    if (pinchRef.current.active && pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()]
      const midX = (pts[0].x + pts[1].x) / 2
      const midY = (pts[0].y + pts[1].y) / 2
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const factor = dist / pinchRef.current.startDist
      const rawScale = pinchRef.current.startScale * factor
      // バウンス範囲(minScale×0.8 〜 maxScale×1.2)まで許容
      const s = clamp(rawScale, minScaleRef.current * 0.8, MAX_SCALE * 1.2)
      pinchRef.current.midX = midX
      pinchRef.current.midY = midY
      applyTransform(
        {
          scale: s,
          translateX: midX - pinchRef.current.alx * s,
          translateY: midY - pinchRef.current.aly * s,
        },
        true
      )
      return
    }

    if (panRef.current.active && e.pointerId === panRef.current.id) {
      const dx = x - panRef.current.lastX
      const dy = y - panRef.current.lastY
      if (!panRef.current.moved) {
        if (Math.hypot(x - panRef.current.startX, y - panRef.current.startY) > 3) {
          panRef.current.moved = true
        }
      }
      if (panRef.current.moved) {
        const t = transformRef.current
        applyTransform({ scale: t.scale, translateX: t.translateX + dx, translateY: t.translateY + dy })
        velRef.current.push({ x: dx, y: dy, t: Date.now() })
        if (velRef.current.length > 6) velRef.current.shift()
      }
      panRef.current.lastX = x
      panRef.current.lastY = y
    }
  }

  const endPinch = () => {
    const t = transformRef.current
    const startTime = pinchRef.current.startTime
    const startScale = pinchRef.current.startScale
    pinchRef.current.active = false
    // 2本指タップ: 接触≤250ms かつ log2 変動≤0.07 → −1レベル
    if (Date.now() - startTime <= 250 && Math.abs(scaleToLevel(t.scale) - scaleToLevel(startScale)) <= 0.07) {
      lerpZoom(-1, pinchRef.current.midX, pinchRef.current.midY)
      return
    }
    // 上下限超過 → スプリング復元
    if (t.scale < minScaleRef.current || t.scale > MAX_SCALE) {
      const limit = t.scale < minScaleRef.current ? minScaleRef.current : MAX_SCALE
      animRef.current = {
        kind: 'bounce',
        limit,
        ax: pinchRef.current.midX,
        ay: pinchRef.current.midY,
        alx: pinchRef.current.alx,
        aly: pinchRef.current.aly,
      }
      startLoop()
    } else {
      commitSnap()
    }
  }

  const handleTap = (x: number, y: number) => {
    const now = Date.now()
    const last = lastTapRef.current
    if (now - last.t < 300 && Math.hypot(x - last.x, y - last.y) < 40) {
      // ダブルタップ: 同地点でズーム済みなら元倍率へトグル、そうでなければ ×2
      const t = transformRef.current
      const zoomed = t.scale > minScaleRef.current * 1.5
      lerpZoom(zoomed ? -1 : 1, x, y)
      lastTapRef.current = { t: 0, x, y, prevScale: t.scale }
    } else {
      lastTapRef.current = { t: now, x, y, prevScale: transformRef.current.scale }
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const p = pointersRef.current.get(e.pointerId)
    pointersRef.current.delete(e.pointerId)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // capture 未取得時は無視
    }

    if (pinchRef.current.active && pointersRef.current.size < 2) {
      endPinch()
      return
    }

    if (panRef.current.active && e.pointerId === panRef.current.id) {
      const wasMoved = panRef.current.moved
      panRef.current.active = false
      if (wasMoved) {
        // 慣性: 直近4フレーム delta 平均
        const samples = velRef.current.slice(-4)
        if (samples.length > 0) {
          const vx = samples.reduce((s, v) => s + v.x, 0) / samples.length
          const vy = samples.reduce((s, v) => s + v.y, 0) / samples.length
          if (Math.hypot(vx, vy) >= 1.5) {
            animRef.current = { kind: 'inertia', vx, vy, frame: 0 }
            startLoop()
          } else {
            commitSnap()
          }
        }
        // ドラッグ後の合成クリック抑制
        suppressClickRef.current = true
        window.setTimeout(() => {
          suppressClickRef.current = false
        }, 0)
      } else if (p) {
        handleTap(p.x, p.y)
      }
    }
  }

  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  // ズームボタン(中央基点)
  const zoomButton = (delta: number) => {
    const r = rect()
    if (!r) return
    cancelAnim()
    lerpZoom(delta, r.width / 2, r.height / 2)
  }

  const resetView = () => {
    cancelAnim()
    const r = rect()
    if (!r) return
    const compact = computeCompact(r.width, r.height)
    const el = layerRef.current
    if (el) {
      el.style.transition = 'transform 0.3s ease-out'
      applyTransform(compact)
      window.setTimeout(() => {
        if (el) el.style.transition = ''
        commitSnap()
      }, 320)
    }
  }

  // 07: 編集モード中は座席タップで詳細パネルを開かず、フローティングアクションバーの選択のみ行う
  const handleSeatSelect = useCallback(
    (seatId: string) => {
      if (isEditMode) return
      setSelectedSeatId(seatId)
      onSeatSelect?.(seatId)
    },
    [onSeatSelect, isEditMode]
  )

  // 05: ディレクトリ選択 → 座席中心へパン+ズーム→パルス強調(reduced-motion 対応)
  const jumpToSeat = useCallback(
    (seat: Seat, onArrive: () => void) => {
      cancelAnim()
      const r = rect()
      const el = layerRef.current
      if (!r || !el) {
        onArrive()
        return
      }
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const t = transformRef.current
      const targetScale = Math.max(t.scale, 1)
      const cx = seat.x + seat.width / 2
      const cy = seat.y + seat.height / 2
      const target: Transform = {
        scale: targetScale,
        translateX: r.width / 2 - cx * targetScale,
        translateY: r.height / 2 - cy * targetScale,
      }

      window.clearTimeout(pulseTimeoutRef.current)

      const playPulse = () => {
        setPulsingSeatId(seat.id)
        const duration = reduced ? PULSE_REDUCED_MS : PULSE_DURATION_MS
        pulseTimeoutRef.current = window.setTimeout(() => {
          setPulsingSeatId(null)
        }, duration)
        onArrive()
      }

      if (reduced) {
        // 即時配置(アニメーションなし)
        el.style.transition = ''
        applyTransform(target)
        commitSnap()
        playPulse()
        return
      }

      el.style.transition = 'transform 0.3s ease-out'
      applyTransform(target)
      window.setTimeout(() => {
        if (el) el.style.transition = ''
        commitSnap()
        playPulse()
      }, 300)
    },
    [applyTransform, cancelAnim, commitSnap]
  )

  useImperativeHandle(ref, () => ({ jumpToSeat }), [jumpToSeat])

  useEffect(() => () => window.clearTimeout(pulseTimeoutRef.current), [])

  const handleFacilitySelect = useCallback(
    (facilityId: string) => {
      onFacilitySelect?.(facilityId)
    },
    [onFacilitySelect]
  )

  useEffect(() => () => cancelAnim(), [cancelAnim])

  const lod = lodOf(scaleSnap)
  const counterScale = useMemo(() => clamp(0.8 / scaleSnap, 1, 2), [scaleSnap])

  // 06: チームid→所属座席の一覧(バウンディングボックス導出用)
  const seatsByTeam = useMemo(() => {
    const map = new Map<string, Seat[]>()
    for (const seat of layout.seats) {
      const arr = map.get(seat.teamId)
      if (arr) arr.push(seat)
      else map.set(seat.teamId, [seat])
    }
    return map
  }, [layout.seats])

  // 06: チームid→導出済み表示領域(座席0件時は Team.area をフォールバック使用)
  const teamAreas = useMemo(() => {
    const map = new Map<string, Rect>()
    for (const team of layout.teams) {
      map.set(team.id, deriveTeamArea(seatsByTeam.get(team.id) ?? [], team.area))
    }
    return map
  }, [layout.teams, seatsByTeam])

  // 06: ラベル・凡例の人数表示はemployeeIdが非nullの所属座席数(在席状態は反映しない・比範囲外)
  const assignedCountByTeam = useMemo(() => {
    const map = new Map<string, number>()
    for (const [teamId, seats] of seatsByTeam) {
      map.set(teamId, seats.filter((s) => s.employeeId !== null).length)
    }
    return map
  }, [seatsByTeam])

  // ── 07: 編集モード ドラッグ移動(座席/チームラベル) ─────────────
  // ドラッグ中はキャンバスパンを抑制(pointerdown を stopPropagation 済みの各要素側から呼ばれる)

  // 兄弟オブジェクト(座席・Facility・Team area)の矩形群(スナップ吸着候補)
  const siblingRectsForSeat = useCallback(
    (excludeSeatId: string): Rect[] => {
      const seatRects = layout.seats.filter((s) => s.id !== excludeSeatId).map((s) => rectOf(s))
      const facilityRects = layout.facilities.map((f) => rectOf(f))
      const teamRects = layout.teams.map((t) => ({ x: t.area.x, y: t.area.y, w: t.area.w, h: t.area.h }))
      return [...seatRects, ...facilityRects, ...teamRects]
    },
    [layout.seats, layout.facilities, layout.teams]
  )

  const siblingRectsForTeam = useCallback(
    (excludeTeamId: string): Rect[] => {
      const teamRects = layout.teams
        .filter((t) => t.id !== excludeTeamId)
        .map((t) => ({ x: t.area.x, y: t.area.y, w: t.area.w, h: t.area.h }))
      const facilityRects = layout.facilities.map((f) => rectOf(f))
      return [...teamRects, ...facilityRects]
    },
    [layout.teams, layout.facilities]
  )

  // 5秒経過で「元に戻す」チップを消去
  const scheduleUndoChipDismiss = useCallback(() => {
    window.clearTimeout(undoChipTimeoutRef.current)
    undoChipTimeoutRef.current = window.setTimeout(() => setUndoChipPos(null), 5000)
  }, [])

  const onSeatEditPointerDown = useCallback(
    (seatId: string, e: React.PointerEvent) => {
      if (!isEditMode) return
      e.stopPropagation()
      const seat = layout.seats.find((s) => s.id === seatId)
      if (!seat) return
      setEditSelectedSeatId(seatId)
      onSeatEditSelect?.(seatId)
      setUndoChipPos(null)
      window.clearTimeout(undoChipTimeoutRef.current)
      editDragRef.current = {
        kind: 'seat',
        seatId,
        pointerId: e.pointerId,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startLogicalX: seat.x,
        startLogicalY: seat.y,
        liveX: seat.x,
        liveY: seat.y,
        moved: false,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [isEditMode, layout.seats, onSeatEditSelect]
  )

  const onTeamLabelEditPointerDown = useCallback(
    (teamId: string, e: React.PointerEvent) => {
      if (!isEditMode) return
      e.stopPropagation()
      const team = layout.teams.find((t) => t.id === teamId)
      if (!team) return
      setUndoChipPos(null)
      window.clearTimeout(undoChipTimeoutRef.current)
      editDragRef.current = {
        kind: 'team',
        teamId,
        pointerId: e.pointerId,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startLogicalX: team.area.x,
        startLogicalY: team.area.y,
        liveX: team.area.x,
        liveY: team.area.y,
        moved: false,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [isEditMode, layout.teams]
  )

  // 編集ドラッグの document 追従(SheetShell と同様 pointerId ベース)
  useEffect(() => {
    if (!isEditMode) return
    const onMove = (e: PointerEvent) => {
      const drag = editDragRef.current
      if (drag.kind === 'none' || drag.pointerId !== e.pointerId) return
      const scale = transformRef.current.scale
      const dxScreen = e.clientX - drag.startScreenX
      const dyScreen = e.clientY - drag.startScreenY
      if (!drag.moved && Math.hypot(dxScreen, dyScreen) > 3) {
        drag.moved = true
      }
      const dxLogical = dxScreen / scale
      const dyLogical = dyScreen / scale
      const rawX = drag.startLogicalX + dxLogical
      const rawY = drag.startLogicalY + dyLogical
      const thresholdViewBox = SNAP_THRESHOLD_SCREEN_PX / scale

      if (drag.kind === 'seat') {
        const seat = layout.seats.find((s) => s.id === drag.seatId)
        if (!seat) return
        const candidateRect: Rect = { x: rawX, y: rawY, w: seat.width, h: seat.height }
        const snap = computeSnap(candidateRect, siblingRectsForSeat(drag.seatId), thresholdViewBox)
        drag.liveX = snap.x
        drag.liveY = snap.y
        setLiveSeatPos({ id: drag.seatId, x: snap.x, y: snap.y })
        setSnapGuides(snap.guides)
      } else {
        const team = layout.teams.find((t) => t.id === drag.teamId)
        if (!team) return
        const candidateRect: Rect = { x: rawX, y: rawY, w: team.area.w, h: team.area.h }
        const snap = computeSnap(candidateRect, siblingRectsForTeam(drag.teamId), thresholdViewBox)
        drag.liveX = snap.x
        drag.liveY = snap.y
        setLiveTeamPos({ id: drag.teamId, x: snap.x, y: snap.y })
        setSnapGuides(snap.guides)
      }
    }
    const onUp = (e: PointerEvent) => {
      const drag = editDragRef.current
      if (drag.kind === 'none' || drag.pointerId !== e.pointerId) return
      editDragRef.current = { kind: 'none' }
      setSnapGuides([])
      if (drag.kind === 'seat') {
        setLiveSeatPos(null)
        if (drag.moved) {
          onSeatMove?.(drag.seatId, drag.liveX, drag.liveY)
          const r = rect()
          if (r) {
            const t = transformRef.current
            setUndoChipPos({
              x: drag.liveX * t.scale + t.translateX,
              y: (drag.liveY + 40) * t.scale + t.translateY,
            })
            scheduleUndoChipDismiss()
          }
        }
      } else {
        setLiveTeamPos(null)
        if (drag.moved) {
          onTeamMove?.(drag.teamId, drag.liveX, drag.liveY)
          const r = rect()
          if (r) {
            const t = transformRef.current
            setUndoChipPos({
              x: drag.liveX * t.scale + t.translateX,
              y: (drag.liveY + 40) * t.scale + t.translateY,
            })
            scheduleUndoChipDismiss()
          }
        }
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [isEditMode, layout.seats, layout.teams, onSeatMove, onTeamMove, siblingRectsForSeat, siblingRectsForTeam, scheduleUndoChipDismiss])

  useEffect(() => () => window.clearTimeout(undoChipTimeoutRef.current), [])

  // 編集モードOFFへ遷移した瞬間に編集専用の選択・ライブ状態を掃除(view側の状態には影響しない)
  useEffect(() => {
    if (isEditMode) return
    setEditSelectedSeatId(null)
    setLiveSeatPos(null)
    setLiveTeamPos(null)
    setSnapGuides([])
    setUndoChipPos(null)
    editDragRef.current = { kind: 'none' }
  }, [isEditMode])

  const handleEditCanvasBackgroundClick = useCallback(() => {
    setEditSelectedSeatId(null)
    onSeatEditSelect?.(null)
  }, [onSeatEditSelect])

  // 07: 選択中座席のフローティングアクションバー画面座標(座席右下近傍)
  const seatActionBarPos = useMemo(() => {
    if (!isEditMode || !editSelectedSeatId) return null
    const seat = layout.seats.find((s) => s.id === editSelectedSeatId)
    if (!seat) return null
    const t = transformRef.current
    return {
      x: (seat.x + seat.width) * t.scale + t.translateX + 8,
      y: (seat.y + seat.height / 2) * t.scale + t.translateY,
    }
    // scaleSnap をトリガーにして transformRef 更新後の再計算を促す(既存 counterScale と同じ手法)
  }, [isEditMode, editSelectedSeatId, layout.seats, scaleSnap])

  // 06: 矩形(論理座標)がビューポート中央に収まるようパン+ズーム
  const panToRect = useCallback(
    (r: Rect) => {
      cancelAnim()
      const containerRect = rect()
      const el = layerRef.current
      if (!containerRect || !el) return
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const fitScale = clamp(
        Math.min((containerRect.width * 0.8) / r.w, (containerRect.height * 0.8) / r.h),
        minScaleRef.current,
        MAX_SCALE
      )
      const t = transformRef.current
      const targetScale = Math.min(t.scale > fitScale ? t.scale : fitScale, MAX_SCALE)
      const cx = r.x + r.w / 2
      const cy = r.y + r.h / 2
      const target: Transform = {
        scale: targetScale,
        translateX: containerRect.width / 2 - cx * targetScale,
        translateY: containerRect.height / 2 - cy * targetScale,
      }
      if (reduced) {
        el.style.transition = ''
        applyTransform(target)
        commitSnap()
        return
      }
      el.style.transition = 'transform 0.3s ease-out'
      applyTransform(target)
      window.setTimeout(() => {
        if (el) el.style.transition = ''
        commitSnap()
      }, 300)
    },
    [applyTransform, cancelAnim, commitSnap]
  )

  // 10: チームバウンダリのタップ→画面座標 rect + チーム色を親へ渡してオーバーレイを開く
  const handleTeamBoundaryOpen = useCallback(
    (teamId: string, rect: DOMRect) => {
      const team = layout.teams.find((t) => t.id === teamId)
      if (!team) return
      const colorEntry = resolveTeamColor(teamColorMap, team.id, team.name)
      onTeamBoundaryClick?.({ teamId, teamName: team.name, teamColor: colorEntry.background, rect })
    },
    [layout.teams, teamColorMap, onTeamBoundaryClick]
  )


  // 空き領域クリックで全チームを閉じる(座席・施設・チームエリア自体は各要素側で stopPropagation 済み)
  // 07: 編集モード中は座席の編集選択(フローティングアクションバー)も併せて解除
  const handleCanvasBackgroundClick = useCallback(() => {
    setExpandedTeamIds((cur) => (cur.size ? new Set() : cur))
    if (isEditMode) handleEditCanvasBackgroundClick()
  }, [isEditMode, handleEditCanvasBackgroundClick])

  // Escapeキーで全チームを閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedTeamIds((cur) => (cur.size ? new Set() : cur))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      ref={containerRef}
      id={SEATMAP_BG_ID}
      className={`seat-map-canvas${panRef.current.moved ? ' is-panning' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
      onClick={handleCanvasBackgroundClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={layerRef} className='seat-map-transform'>
        {/* z順: チームエリア → 施設 → 座席。チームは常時表示(トグル廃止) */}
        {layout.teams.map((team) => {
          const colorEntry = resolveTeamColor(teamColorMap, team.id, team.name)
          const baseArea = teamAreas.get(team.id) ?? team.area
          // 07: 編集ドラッグ中のチームはライブ座標を優先表示(確定は pointerup 時)
          const area =
            liveTeamPos && liveTeamPos.id === team.id
              ? { ...baseArea, x: liveTeamPos.x, y: liveTeamPos.y }
              : baseArea
          return (
            <TeamArea
              key={team.id}
              team={team}
              area={area}
              colorEntry={colorEntry}
              presentCount={assignedCountByTeam.get(team.id) ?? 0}
              counterScale={counterScale}
              selected={false}
              dimmed={false}
              onBoundaryOpen={handleTeamBoundaryOpen}
              isEditMode={isEditMode}
              onLabelEditPointerDown={onTeamLabelEditPointerDown}
              onLabelTap={onTeamLabelTap}
            />
          )
        })}
        {layout.facilities.map((f) => (
          <FacilityBlock
              key={f.id}
              facility={f}
              counterScale={counterScale}
              onSelect={handleFacilitySelect}
              state={facilityStateById?.get(f.id)}
              lod={lod}
            />
        ))}
        {/* 10: 座席は常時レンダー。詳細度は LOD のみで変わる(チームクリックはオーバーレイを開くだけ) */}
        {layout.seats
          .map((seat) => {
            const emp = seat.employeeId ? employeeById.get(seat.employeeId) ?? null : null
            const status = emp ? presenceMap.get(emp.id) ?? 'present' : 'present'
            // 07: 編集ドラッグ中の座席はライブ座標を優先表示(確定は pointerup 時)
            const displaySeat =
              liveSeatPos && liveSeatPos.id === seat.id ? { ...seat, x: liveSeatPos.x, y: liveSeatPos.y } : seat
            return (
              <SeatCard
                key={seat.id}
                seat={displaySeat}
                employee={emp}
                status={status}
                selected={seat.id === selectedSeatId}
                pulsing={seat.id === pulsingSeatId}
                lod={lod}
                counterScale={counterScale}
                onSelect={handleSeatSelect}
                isEditMode={isEditMode}
                isEditDragging={liveSeatPos?.id === seat.id}
                onEditPointerDown={onSeatEditPointerDown}
              />
            )
          })}
        {isEditMode && snapGuides.length > 0 && (
          <AlignmentGuides guides={snapGuides} viewBoxW={layout.viewBox.width} viewBoxH={layout.viewBox.height} />
        )}
      </div>
      {/* 原本には常時表示の凡例パネルは無い(チーム名は各アイランドのラベル板で表示) */}
      <ZoomControls onZoomIn={() => zoomButton(1)} onZoomOut={() => zoomButton(-1)} onReset={resetView} />
      {isEditMode && seatActionBarPos && editSelectedSeatId && (
        <SeatActionBar
          x={seatActionBarPos.x}
          y={seatActionBarPos.y}
          onChangeTeam={() => onSeatChangeTeamRequest?.(editSelectedSeatId)}
          onDelete={() => onSeatDeleteRequest?.(editSelectedSeatId)}
        />
      )}
      {isEditMode && undoChipPos && canUndo && (
        <UndoChip
          x={undoChipPos.x}
          y={undoChipPos.y}
          onUndo={() => {
            onUndo?.()
            setUndoChipPos(null)
            window.clearTimeout(undoChipTimeoutRef.current)
          }}
        />
      )}
    </div>
  )
})
