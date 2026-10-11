// useMinimapCollapse(ミニマップの開閉)の開閉状態を localStorage へ読み書きする

// ミニマップの開閉状態。別のチームを開いても引き継ぐので localStorage に置く。
// 既定は開 — 保存値が無ければ展開状態で見せる(閉じたい場合は明示的にトグルさせる)
const STORAGE_KEY = 'seatmap::minimap-open'

export const readStored = (): boolean => {
  if (typeof window === 'undefined') return true
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === null ? true : stored === 'true'
}

// SSR(window が無い)は参照の時点で例外になり、容量超過と同じ catch が受ける
export const writeStored = (isOpen: boolean): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(isOpen))
  } catch {
    // 容量超過などは無視(開閉状態を覚えられなくても表示は続ける)
  }
}
