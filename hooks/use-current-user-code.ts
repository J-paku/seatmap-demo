// 実物は Garoon ログインIDから4桁社員番号を抽出する。デモは「本人」が固定なので定数を返す
import { SELF_OWNER_CODE } from '@/utils/demo-identity'

export function useCurrentUserCode(): string | null {
  return SELF_OWNER_CODE
}
