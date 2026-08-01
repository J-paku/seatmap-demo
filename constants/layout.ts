// シートマップのレイアウト・z-index・スナップ・LOD 定数とヘルパー関数
import type { SeatShape } from '@/types'

// チームエリア・座席グリッド計算で使用するレイアウト定数
export const LAYOUT_PADDING = 20
export const LAYOUT_COL_GAP = 18
export const LAYOUT_ROW_GAP = 20
export const TOP_CONTROL_INSET = 34
export const RESIZE_FIT_TOLERANCE = 10

// チームエリア最小サイズ（teamBoundaryCalc / teamAreaGeometry で共通使用）
export const MIN_AREA_W = 200
export const MIN_AREA_H = 100

// チーム境界ボックスの拡大率（座席バウンディングボックスに対する倍率）
// 1.0 = 座席ぴったり / >1.0 で席数・グリッドに比例して余白が広がり、テーブルが大きく見える
// チームテーブルのサイズ感はこの 1 か所で調整する
export const TEAM_AREA_SIZE_SCALE = 1.2

// 家具オブジェクト最小サイズ
export const MIN_FURNITURE_W = 20
export const MIN_FURNITURE_H = 20

// レイアウト初期 viewBox（座席データ未取得時・パース失敗時のフォールバック）
export const DEFAULT_VIEWBOX = { width: 1100, height: 700 }

// カスタム（マイ）レイアウト専用の固定作業領域（FHD）。
// 動的拡張せずこの枠に固定し、オブジェクトは領域内へクランプする
export const FHD_VIEWBOX = { width: 1920, height: 1080 }

// px ↔ cm 変換定数（1cm = 10px）
export const PX_PER_CM = 10

/** px → cm 変換（小数点1桁・四捨五入） */
export function pxToCm(px: number): number {
  return Math.round((px / PX_PER_CM) * 10) / 10
}

/** cm → px 変換（整数に丸め） */
export function cmToPx(cm: number): number {
  return Math.round(cm * PX_PER_CM)
}

// 形状別デフォルトサイズ（座席形状変更時の初期値）
export const SHAPE_DIMENSIONS: Record<SeatShape, { width: number; height: number }> = {
  standard: { width: 105, height: 75 },
  executive: { width: 110, height: 90 },
  vertical: { width: 75, height: 105 },
}

export const SEAT_SIZE_MIN = 50
export const SEAT_SIZE_MAX = 200

// 自由配置スナップグリッド単位（カード半分程度の自由度を確保しつつ整列感を維持）
export const SNAP_GRID_X = 15
export const SNAP_GRID_Y = 15

// 整列ガイドライン検出閾値（SVG座標単位・グリッドスナップ後に適用）
// 感知範囲を広げてユーザーがガイドを認識しやすくする
export const ALIGN_SNAP_THRESHOLD = 15

// ゴースト配置（チーム/設備など大きめオブジェクト）の整列スナップ基準閾値（画面 px 基準）。
// 座席より大きく、タッチで精密に合わせにくいため広めに取る。実閾値は zoom 倍率と
// オブジェクトサイズに応じて useGhostPlacementFlow 側で拡張する
export const GHOST_ALIGN_SNAP_THRESHOLD = 28

// ゴーストリサイズの SVG 辺長クランプ（useGhostPlacement のリサイズと ghostAlignment の整列で共有）
export const GHOST_MIN_SVG_SIZE = 40
export const GHOST_MAX_SVG_SIZE = 2500

// キャンバスのパン/ズーム transform が掛かるレイヤーのセレクタ（CanvasContent.tsx と対応）
export const CANVAS_TRANSFORM_LAYER_SELECTOR = '[data-canvas-transform-layer=true]'

// ─── z-index トークン（ページレベル / root stacking context） ───
export const Z_EDIT_DIM = 8
export const Z_EDIT_CANVAS = 9
export const Z_EDIT_LABEL = 10
export const Z_CONTROLS = 10
export const Z_INDICATOR = 20
export const Z_HOVER_CARD = 24
export const Z_OVERLAY = 30
export const Z_FLOATING = 40
// 編集コントロール(完了/取消リモコン・上部ヘルプ/終了): キャンバス上には出すが、取込シート等のモーダル(Z_OVERLAY+10 以上)より背面に置く
export const Z_EDIT_CONTROLS = 35
// AdminAddFab はキャンバス上にだけ重なれば良く、各種オーバーレイ/モーダル/backdrop より下に置く
export const Z_ADMIN_FAB = 11
export const Z_MODAL = 50
// 座席/人物詳細パネルは社員ディレクトリ（Z_MODAL）より前面に重ねる
export const Z_DETAIL_PANEL = 55
// 予定詳細パネルは座席/人物詳細（Z_DETAIL_PANEL）から派生して開くため、その上に重ねる
export const Z_SCHEDULE_DETAIL_PANEL = 56
export const Z_DRAG_GHOST = 60
export const Z_SAVE_OVERLAY = 65

// ─── z-index トークン（キャンバス内部 stacking context） ───
export const Z_CANVAS_TEAM_MOVE = 9
export const Z_CANVAS_SEAT_DRAG = 10
export const Z_CANVAS_TEAM_DRAG = 11
export const Z_CANVAS_RESIZE = 12

// ズームレベルに応じた表示詳細度（LOD）
export type LodLevel = 'detail' | 'mid' | 'overview'
export const LOD_THRESHOLD_DETAIL = 0.5
export const LOD_THRESHOLD_MID = 0.3

// 英語名前レンダーリング補助
export const ENGLISH_SEAT_NAME_FONT_SCALE = 0.9
export const ENGLISH_SEAT_NAME_TEXT_COMPENSATE_MAX = 1.12

// 施設の会議ステータス文字の最小フォントサイズ(px)。低ズームでも可読性を確保
export const MIN_FACILITY_STATUS_FONT_SIZE = 8

// ヘッダー選択状態の永続化キーと表示上限
export const SELECTED_SEAT_KEY = 'selected_search_seat_ids'

export function getLodLevel(scale: number): LodLevel {
  if (scale >= LOD_THRESHOLD_DETAIL) return 'detail'
  if (scale >= LOD_THRESHOLD_MID) return 'mid'
  return 'overview'
}

/** グリッドピッチ（座席サイズ＋ギャップ）を一括算出するヘルパー */
export function computeGridPitch(
  seatW: number,
  seatH: number,
  colGap = LAYOUT_COL_GAP,
  rowGap = LAYOUT_ROW_GAP
): { colPitch: number; rowPitch: number } {
  return {
    colPitch: seatW + colGap,
    rowPitch: seatH + rowGap,
  }
}

// （ズーム100%基準）座席詳細表示レイアウト定数
export const SEAT_DETAIL_LAYOUT = {
  // テキスト左端オフセット（座席左端からの距離）
  textOffsetX: {
    editing: 28,
    view: 10,
  },
  // 氏名Yオフセット（座席上端からの距離）
  nameOffsetY: {
    tallEdit: { executive: 29, standard: 24 },
    detail: { executive: 15, standard: 6 },
    compact: { executive: 18, standard: 12 },
  },
  // 氏名フォントサイズ（ベース＋executive加算）
  nameFontSize: {
    tallEdit: 12,
    detail: 13.2,
    executiveBonus: 1,
  },
  // 部署名フォントサイズ（ベース＋executive加算）
  teamFontSize: {
    tallEdit: 10.8,
    detail: 11.8,
    executiveBonus: 0.7,
  },
  // 氏名→部署名の間隔
  nameToTeamGap: {
    tallEdit: 4,
    detail: 3,
  },
  // Garoonステータスドット
  statusDot: { size: 6, gap: 4 },
  // Garoonステータスラベル位置
  statusLabel: { offsetX: 10, offsetY: 6 },
  // 空席pill
  vacantPill: {
    width: 36,
    height: 16,
    radius: 8,
    offsetX: -18,
    offsetY: -8,
    textOffsetY: 4,
    fontSize: 13.5,
  },
} as const
