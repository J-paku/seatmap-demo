import type { Lod } from '../type'

// パルス演出時間(通常/reduced-motion)

// モーダル表示中はキャンバス操作を無効化
export const isModalOpen = (): boolean =>
  typeof document !== 'undefined' && document.querySelector("[role='dialog'][aria-modal='true']") !== null

export const lodOf = (scale: number): Lod => (scale >= 0.5 ? 'detail' : scale >= 0.3 ? 'mid' : 'overview')

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
