import type { RefObject } from 'react'
import type { Transform } from '@/utils/layout/geometry'
import type { Employee, LayoutObjectRef, Lod, PresenceStatus, SeatLayout, TeamOverlayPayload } from '@/types'

export type { Lod }
import type { FacilityState } from '@/utils/facility-status'
import type { FacilityHoverPayload } from '@/components/FacilityHoverCard'

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
  onSeatAssignRequest?: (seatId: string) => void
  onSeatChangeTeamRequest?: (seatId: string) => void
  onSeatDeleteRequest?: (seatId: string) => void
  // 会議室・家具の編集。閲覧モードでは undefined のままでこの経路へ到達しない
  onObjectMove?: (ref: LayoutObjectRef, x: number, y: number) => void
  onObjectRepositionRequest?: (ref: LayoutObjectRef) => void
  onObjectDeleteRequest?: (ref: LayoutObjectRef) => void
  // ゴーストで掴み直し中の対象(実体を淡く描くためだけに使う)
  repositioningRef?: LayoutObjectRef | null
  onUndo?: () => void
  canUndo?: boolean
  // リモコンの自席ボタン。編集モードでは渡さない(オーバーレイが出ないため)
  onGoToMySeat?: () => void
}

// 親が ref 経由で呼び出すキャンバスの命令
export type SeatMapCanvasHandle = {
  // 検索ヒットからオーバーレイを開くときはクリックイベントが無いため、拡大原点の矩形をここで実測する。
  // チーム矩形は画面外でも常に描画されているのでキャンバスを動かさずに測れる。
  // 引数は data-team-id 属性の値 = Team.idPrefix であり Team.id ではない
  measureTeamRect: (idPrefix: string) => DOMRect | null
  // ゴーストで新規配置したあと、置いた場所へ「元に戻す」チップを出す。
  // 配置フローはキャンバスの外(SeatMapView)にあるので、変換を持つこちら側へ依頼する
  showUndoChipAt: (logicalX: number, logicalY: number, message: string, frame?: Rect | null) => void
  // コーチマークの対象が画面外のとき、その要素をキャンバス中央へ寄せる
  centerOnSelector: (selector: string) => void
}

export type Rect = { x: number; y: number; w: number; h: number }

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
  | (EditDragBase & { kind: 'object'; ref: LayoutObjectRef })

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
