import { EMPLOYEES } from '@/lib/mock-loader'

// 完了処理の疑似遅延(01のfetchMock経由に準拠した保存中表現)
export const FINISH_DELAY_MS = 400
// 07-6: 保存成功トーストの表示時間(仕様通り5秒)。画面中央への配置は seatmap.module.css の .saveToast 側
export const TOAST_MS = 5000

// 楽観ロックの照合・「元に戻す」用スナップショットの読み直しで使う実在社員id集合。
// hooks/use-mock-data.ts の VALID_EMPLOYEE_IDS と同じ EMPLOYEES から作る(同一ソースからの
// 同一導出なので判定基準の重複には当たらない)。「元に戻す」は読み直した版をそのまま書き戻すため、
// 空集合などで誤魔化すと宙ぶらりん社員idの穴埋めが狂う
export const VALID_EMPLOYEE_IDS: ReadonlySet<string> = new Set(
  EMPLOYEES.map(employee => employee.id)
)
