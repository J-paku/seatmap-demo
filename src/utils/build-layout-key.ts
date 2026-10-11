import type { FloorId } from '@/types'
import type { LayoutSource } from '@/contexts/layout-source-context'

// 07: 保存済みレイアウトの上書き分を扱うSWRキー(mock/系に合わせ、mutateで表示即時更新できるようにする)。
// STEP2: source(公式のフロア/カスタム)ごとにキーを分ける。固定のままだと切り替えても前のキャッシュが返り続ける
const officialLayoutSwrKey = (floorId: FloorId): string => `mock/layout-override:${floorId}`
const customLayoutSwrKey = (layoutId: string): string => `mock/layout:${layoutId}`
export const layoutSwrKey = (source: LayoutSource, floorId: FloorId): string =>
  source.type === 'official' ? officialLayoutSwrKey(floorId) : customLayoutSwrKey(source.layoutId)
