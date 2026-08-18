import type { RefObject } from 'react'
import type { Transform } from '@/utils/layout/geometry'
import type { Employee, LayoutObjectRef, Lod, SeatLayout, TeamOverlayPayload } from '@/types'

export type { Lod }
import type { FacilityState } from '@/utils/facility-status'
import type { FacilityHoverPayload } from '@/components/FacilityHoverCard'

export type SeatMapCanvasProps = {
  layout: SeatLayout
  employeeById: Map<string, Employee>
  onSeatSelect?: (seatId: string) => void
  onFacilitySelect?: (facilityId: string) => void
  // 10: チームバウンダリのタップで大型オーバーレイを開く(画面座標 rect を親へ渡す)
  onTeamBoundaryClick?: (payload: TeamOverlayPayload) => void
  // 会議室状態(facilityId → 状態)
  facilityStateById?: Map<string, FacilityState>
  onFacilityHover?: (payload: FacilityHoverPayload | null) => void
  // 07: 編集モード中のみ有効。未指定(閲覧モード)では以下の分岐へ一切到達しない
  isEditMode?: boolean
  onSeatEditSelect?: (seatId: string | null) => void
  // 05-3: セッション中のチーム枠タップ。呼び出し側は移動ゴーストを開く
  onTeamTap?: (teamId: string) => void
  onSeatAssignRequest?: (seatId: string) => void
  onSeatDeleteRequest?: (seatId: string) => void
  // 05-4 の一括操作バー。選択中の座席IDをそのまま渡す
  onSeatRotateRequest?: (seatIds: string[]) => void
  onSeatShapeRequest?: (seatIds: string[]) => void
  // 2席以上の一括削除確認(仕様 07-2)。1席は onSeatDeleteRequest がそのまま受ける
  onSeatBulkDeleteRequest?: (seatIds: string[]) => void
  // Escape 2段目のセッション終了(仕様 05-3)。ゴースト配置中は渡さないこと —
  // 渡すと Escape が配置キャンセルではなくセッション破棄になる(仕様 04-1 違反)
  onEndSession?: () => void
  // 05-3: 家具・会議室タップの行き先。移動ゴーストを開く(タップ即1段階)
  onObjectRepositionRequest?: (ref: LayoutObjectRef) => void
  onObjectDeleteRequest?: (ref: LayoutObjectRef) => void
  // 05-3: 属性バーのロック/ラベル表示トグル
  onObjectLockToggle?: (ref: LayoutObjectRef, locked: boolean) => void
  onObjectLabelToggle?: (ref: LayoutObjectRef, labelVisible: boolean) => void
  // ゴーストで掴み直し中の対象(実体を淡く描くためだけに使う)
  repositioningRef?: LayoutObjectRef | null
  onUndo?: () => void
  canUndo?: boolean
  // リモコンの自席ボタン。編集モードでは渡さない(オーバーレイが出ないため)
  onGoToMySeat?: () => void
  // 05-1: チーム枠・家具の長押しで編集セッションへ入る。編集モードでは渡さない
  onEnterEditSession?: () => void
}

// 親が ref 経由で呼び出すキャンバスの命令
export type SeatMapCanvasHandle = {
  // 検索ヒットからオーバーレイを開くときはクリックイベントが無いため、拡大原点の矩形をここで実測する。
  // チーム矩形は画面外でも常に描画されているのでキャンバスを動かさずに測れる。
  // 引数は data-team-id 属性の値 = Team.idPrefix であり Team.id ではない
  measureTeamRect: (idPrefix: string) => DOMRect | null
  // ゴーストで新規配置したあと、置いた場所へ「元に戻す」チップを出す。
  // 配置フローはキャンバスの外(SeatMapView)にあるので、変換を持つこちら側へ依頼する
  showUndoChipAt: (request: UndoChipRequest) => void
  // コーチマークの対象が画面外のとき、その要素をキャンバス中央へ寄せる
  centerOnSelector: (selector: string) => void
}

export type Rect = { x: number; y: number; w: number; h: number }

// 07: 「元に戻す」チップ1回分の要求。座標はすべて viewBox 単位で受け取り、
// 画面座標への投影はチップ側が毎フレーム行う(パン・ズームへ追従させるため)
export type UndoChipRequest = {
  // 対象の下辺中央
  anchor: { x: number; y: number }
  // 「配置しました」「移動しました」「削除しました」
  message: string
  // 削除時のみ: 消えた位置に残す残像フレーム
  frame: Rect | null
  // 直前に置いた・動かした対象。チップと同じ寿命で強調する(チーム枠は対象外)
  recent: RecentPlacement | null
}

// 投影済みの表示位置。非表示なら null
export type UndoChipView = { chip: { x: number; y: number }; frame: Rect | null }

// 直前に置いた・動かした対象。チップと同じ寿命で強調する(チーム枠は対象外)
export type RecentPlacement = { kind: 'facility' | 'furniture'; rect: Rect }

// rAF ループで進行中の演出
export type Anim =
  | { kind: 'none' }
  | { kind: 'inertia'; vx: number; vy: number; frame: number }
  | { kind: 'lerp'; targetLevel: number; ax: number; ay: number; alx: number; aly: number }
  | { kind: 'bounce'; limit: number; ax: number; ay: number; alx: number; aly: number }

// 押下の追跡。ドラッグ移動は廃した(移動導線はタップ → ゴースト → 配置の1本)ので、
// 記録するのは「動かさずに離したか = タップだったか」を決めるためだけ。
// 座席のドラッグ移動はここに無い。座席はキャンバスに描かれない(CLAUDE.md 不変ルール1)ため、
// 座席位置の編集はチームオーバーレイのグリッド(編集4)が持つ
export type PressState = { pointerId: number; startX: number; startY: number; moved: boolean }

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
