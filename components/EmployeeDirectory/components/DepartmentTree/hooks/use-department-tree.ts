// 部署ツリーコンポーネントの共有アバター状態を集約するカスタムフック
import { useSharedAvatars } from '@/contexts/avatars-context'

export function useDepartmentTree() {
  const { avatarConfigByOwnerCode } = useSharedAvatars()

  return {
    avatarConfigByOwnerCode,
  }
}
