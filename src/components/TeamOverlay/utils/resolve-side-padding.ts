import { COMPACT_SIDE_PADDING_PX } from './seat-grid'

// 座席配置セクションの見出し・同期バッジの左右余白。Compact だけグリッドのパディングに揃える
export const resolveSidePadding = (isCompactMobile: boolean): number =>
  isCompactMobile ? COMPACT_SIDE_PADDING_PX : 0
