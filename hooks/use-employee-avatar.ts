// 社員1人分の表示用アバター設定を解決する。実物の社員カードと同じ優先順:
// 共有アバターキャッシュ(ownerCode) → 未登録なら employee.id をシードにした既定プリセット
import type { Employee, PixelAvatarConfig } from '@/types'
import { useSharedAvatars } from '@/contexts/avatars-context'
import { resolveDefaultPresetId } from '@/utils/avatar/default-preset'

export function useEmployeeAvatar(employee: Employee | null | undefined): PixelAvatarConfig | null {
  const { avatarConfigByOwnerCode } = useSharedAvatars()
  if (!employee) return null
  const stored = employee.ownerCode ? avatarConfigByOwnerCode.get(employee.ownerCode) : undefined
  return stored ?? { kind: 'preset', id: resolveDefaultPresetId(employee.id) }
}
