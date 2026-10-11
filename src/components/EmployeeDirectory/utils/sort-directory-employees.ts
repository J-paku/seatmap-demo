// useEmployeeDirectory(社員ディレクトリ)が部署の束ねと部署内の並び替えに使うキー
import type { Employee } from '@/types'
import { UNASSIGNED_DEPARTMENT } from '@/utils/unassigned-department'

export const normalizeDepartment = (team: string) => {
  const trimmed = team.trim()
  return trimmed.length > 0 ? trimmed : UNASSIGNED_DEPARTMENT
}

// 並び替え用の社員番号を解決（数値が小さいほど先輩 → 昇順で上位に並ぶ）
// 第一に ownerCode（UserCode 由来の整形済み社員番号）を使用。メール形式 LoginId のパースは不安定なため未取得時のみフォールバック
// LoginId はメール形式 (例: ab1234@example.co.jp) のため @ 前のローカル部から連続4桁以上の数字を抽出する
// 桁数増加 (番号枯渇対策) に備えて数値で返し、抽出不可の社員は null で末尾へ送る
export const resolveSortCode = (employee: Employee): number | null => {
  const fromOwnerCode = employee.ownerCode?.match(/\d+/)?.[0]
  if (fromOwnerCode) return Number(fromOwnerCode)
  const localPart = employee.email?.split('@')[0]
  const matched = localPart?.match(/\d{4,}/)
  return matched ? Number(matched[0]) : null
}

// 役職ランク（上位ほど先頭）。employee.position は役職マスター(ClassA=役職区分, SiteId=5026620)由来の正確な文字列のため完全一致で突合する
// 一般職員以下（一般職員/特定職/嘱託/契約/パート/その他）は getPositions 側で除外済みのため、ここには管理職役職のみが到達する
// 一覧に無い役職は「役職ありの末尾」へ送り、同ランク内は社員番号で決める
const POSITION_RANK_ORDER = [
  '代表取締役会長',
  '取締役会長',
  '代表取締役社長',
  '取締役副社長執行役員',
  '取締役専務執行役員',
  '取締役常務執行役員',
  '取締役執行役員',
  '取締役相談役',
  '相談役',
  '取締役シニアフェロー',
  '監査役',
  '顧問',
  '執行役員本部長',
  '執行役員事業部長',
  '執行役員統括部長',
  '執行役員部長',
  '執行役員支店長',
  'スーパーバイザー',
  '本部長',
  '事業部長',
  '統括部長',
  '部長',
  '支店長',
  '室長',
  '次長',
  '課長',
  '所長',
  '課長代理（管理職）',
  '所長代理（管理職）',
  '課長代理（組合員）',
  '所長代理（組合員）',
  '参与',
  '係長',
  '主任',
  '副主任',
  'チームリーダー',
]

// 役職の優先度を数値化する。役職なし=最下位、役職ありで一覧外=既知役職の直後
// Infinity は役職なし同士の減算が NaN になり比較器が壊れる（第2キーの社員番号比較に到達しない）ため有限値を使う
export const resolvePositionRank = (employee: Employee): number => {
  const position = employee.position?.trim()
  if (!position) return POSITION_RANK_ORDER.length + 1
  const index = POSITION_RANK_ORDER.indexOf(position)
  return index >= 0 ? index : POSITION_RANK_ORDER.length
}
