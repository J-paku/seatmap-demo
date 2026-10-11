import type { Lod } from '../type'

// キャンバスの入力を止めるか(モーダル表示中か)と、拡大率に応じた描き込みの段階(LOD)の判定

// モーダル表示中はキャンバス操作を無効化
export const isModalOpen = (): boolean =>
  typeof document !== 'undefined' &&
  document.querySelector("[role='dialog'][aria-modal='true']") !== null

export const lodOf = (scale: number): Lod =>
  scale >= 0.5 ? 'detail' : scale >= 0.3 ? 'mid' : 'overview'
