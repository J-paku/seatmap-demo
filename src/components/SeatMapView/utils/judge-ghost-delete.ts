import type { Facility, LayoutObjectRef, Team } from '@/types'

// 04-4: 移動ゴーストの削除ボタンの出し方

// 削除ボタンを出すのは掴み直し(移動モード)のときだけ。新規配置には消す対象がまだ無い
export const canDeleteGhost = (repositioningRef: LayoutObjectRef | null): boolean =>
  repositioningRef !== null

// 削除確認(会議室・チーム)のどちらかが開いている間 = 削除処理中とみなす
export const isDeleteConfirmOpen = (
  deleteObjectTarget: Facility | null,
  deleteTeamTarget: Team | null
): boolean => deleteObjectTarget !== null || deleteTeamTarget !== null
