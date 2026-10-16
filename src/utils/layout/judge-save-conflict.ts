import type { LayoutSource } from '@/contexts/layout-source-context'
import type { StoredSeatLayout } from '@/types'

// 05-6: 楽観ロック(「他の管理者が更新しました」)の照合

// 手元が覚えている版(expectedUpdatedTime)と、保存の直前に読み直した保存分の版が食い違えば、
// 別タブが先に上書きしている。読み直した保存分が無ければ照合する相手が無いので衝突なしとする
export const isUpdateConflict = (
  expectedUpdatedTime: string | undefined,
  currentStored: Pick<StoredSeatLayout, 'updatedTime'> | null
): boolean => currentStored !== null && currentStored.updatedTime !== expectedUpdatedTime

// 保存(地図の「完了」)の照合。カスタムレイアウトだけを照合する
// (公式は仕様上競合検知なし)
export const isCustomSaveConflict = (
  source: LayoutSource,
  expectedUpdatedTime: string | undefined,
  currentStored: Pick<StoredSeatLayout, 'updatedTime'> | null
): boolean => source.type === 'custom' && isUpdateConflict(expectedUpdatedTime, currentStored)
