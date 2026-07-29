import type { RefObject } from 'react'
import type { Transform } from '@/utils/geometry'
import type { Employee, PresenceStatus, Seat, SeatLayout } from '@/types'
import type { FacilityState } from '@/utils/facility-status'
import type { FacilityHoverPayload } from '@/components/FacilityHoverCard'
import type { TeamOverlayPayload } from '@/components/TeamOverlay'

export type SeatMapCanvasProps = {
  layout: SeatLayout
  employeeById: Map<string, Employee>
  presenceMap: Map<string, PresenceStatus>
  onSeatSelect?: (seatId: string) => void
  onFacilitySelect?: (facilityId: string) => void
  // 10: チームバウンダリのタップで大型オーバーレイを開く(画面座標 rect を親へ渡す)
  onTeamBoundaryClick?: (payload: TeamOverlayPayload) => void
  // 会議室状態(facilityId → 状態)
  facilityStateById?: Map<string, FacilityState>
  onFacilityHover?: (payload: FacilityHoverPayload | null) => void
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

// 05: ディレクトリからの「座席へジャンプ」命令(親が ref 経由で呼び出す)
export type SeatMapCanvasHandle = {
  jumpToSeat: (seat: Seat, onArrive: () => void) => void
}

export type Rect = { x: number; y: number; w: number; h: number }

// LOD(詳細度)。座席の視覚カードは廃止したが施設・チームの詳細度切替には引き続き使用
export type Lod = 'detail' | 'mid' | 'overview'

// rAF ループで進行中の演出
export type Anim =
  | { kind: 'none' }
  | { kind: 'inertia'; vx: number; vy: number; frame: number }
  | { kind: 'lerp'; targetLevel: number; ax: number; ay: number; alx: number; aly: number }
  | { kind: 'bounce'; limit: number; ax: number; ay: number; alx: number; aly: number }

// 07: 編集モード中のドラッグ状態(座席/チームラベル共用)。view モードでは常に不使用
type EditDragBase = {
  pointerId: number
  startScreenX: number
  startScreenY: number
  startLogicalX: number
  startLogicalY: number
  liveX: number
  liveY: number
  moved: boolean
}

export type EditDrag =
  | { kind: 'none' }
  | (EditDragBase & { kind: 'seat'; seatId: string })
  | (EditDragBase & { kind: 'team'; teamId: string })

// ドラッグ中のみ描画へ反映する座標(確定は pointerup 時に親へ1回だけ通知)
export type LivePosition = { id: string; x: number; y: number }

// パン・ズームの変換モデルが公開するAPI(useViewport の戻り値)
export type Viewport = {
  containerRef: RefObject<HTMLDivElement | null>
  layerRef: RefObject<HTMLDivElement | null>
  transformRef: RefObject<Transform>
  minScaleRef: RefObject<number>
  animRef: RefObject<Anim>
  scaleSnap: number
  // ジェスチャー終了時点の変換スナップショット。レンダー中に ref を読まずに済ませるため
  transformSnap: Transform
  rect: () => DOMRect | null
  applyTransform: (t: Transform, allowOverscroll?: boolean) => void
  commitSnap: () => void
  cancelAnim: () => void
  startLoop: () => void
  lerpZoom: (deltaLevel: number, anchorX: number, anchorY: number) => void
  immediateZoom: (deltaLevel: number, anchorX: number, anchorY: number, overscroll?: boolean) => void
  animateTo: (target: Transform, onDone?: () => void) => void
}
