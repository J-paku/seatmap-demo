// 本人のピクセルアバター設定を返す単一ソースフック — useCurrentUserCode と共有アバターキャッシュを結合
import { useSharedAvatars } from '@/contexts/avatars-context'
import { useCurrentUserCode } from '@/hooks/use-current-user-code'
import type { PixelAvatarConfig } from '@/types'

// サイドバーフッターと社員カード本人行が共通利用し、編集後の即時同期を保証する
export function useMyAvatarConfig(): PixelAvatarConfig | null {
  const ownerCode = useCurrentUserCode()
  const { avatarConfigByOwnerCode } = useSharedAvatars()

  if (!ownerCode) {
    return null
  }

  return avatarConfigByOwnerCode.get(ownerCode) ?? null
}
