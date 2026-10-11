import type { Rect } from '@/utils/layout/rect'
import type { MinimapArea } from '@/types'

// 編集開始で席0件のチームへ1×1グリッドを起こすときの基準の矩形。
// ミニマップのチーム領域が渡されていなければ原点の空矩形にする
export const resolveTeamRect = (minimapTeamArea: MinimapArea | null): Rect =>
  minimapTeamArea ?? { x: 0, y: 0, w: 0, h: 0 }
