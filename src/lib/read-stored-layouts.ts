import { loadDefaultLayoutId, loadLayoutMetas } from '@/lib/layout-persistence'
import type { LayoutMeta } from '@/types'

// 一覧とデフォルトIDは常にlocalStorageへ書いてから状態へ写す関係なので、2つで1組として扱う
export type StoredLayouts = {
  layoutMetas: LayoutMeta[]
  defaultLayoutId: string | null
}

export const readStoredLayouts = (): StoredLayouts => ({
  layoutMetas: loadLayoutMetas(),
  defaultLayoutId: loadDefaultLayoutId(),
})

// getSnapshotは呼ぶたびに同じ参照を返す必要があるので、最初の1回だけ読んで保持する
let storedLayoutsSnapshot: StoredLayouts | null = null
export const getStoredLayouts = (): StoredLayouts => {
  if (!storedLayoutsSnapshot) storedLayoutsSnapshot = readStoredLayouts()
  return storedLayoutsSnapshot
}
