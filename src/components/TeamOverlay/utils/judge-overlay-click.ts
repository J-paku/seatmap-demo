import { resolveSeatIdFromElement, SEAT_GRID_CELL_ATTR } from './seat-drag-attrs'

// オーバーレイ内のクリックがどこに当たったかの判定。閉じる・解除する操作そのものは呼び出し側が行う

// ラッパー余白のクリックか(パネル自身のクリックは stopPropagation でここまで届かない)
export const isMarginClick = (target: EventTarget, currentTarget: EventTarget): boolean =>
  target === currentTarget

// ヒット表示はその席自身のクリック以外で解除する。座席以外(空白・ヘッダー・
// ミニマップ等)をクリックした時に消えなかったのが元の不具合。ヒット席自身の
// クリックだけは社員詳細を開く経路と競合するため除外する
export const shouldClearHighlight = (
  target: HTMLElement,
  highlightSeatId: string | null
): boolean => Boolean(highlightSeatId) && resolveSeatIdFromElement(target) !== highlightSeatId

// 編集中はセル(席・空セルどちらも data-seat-grid-cell を持つ)以外のタップで選択解除する。
// グリッド余白・オーバーレイ余白のどちらもこの1箇所で拾える
export const shouldClearSelection = (target: HTMLElement, isEditMode: boolean): boolean =>
  isEditMode && !target.closest(`[${SEAT_GRID_CELL_ATTR}]`)
