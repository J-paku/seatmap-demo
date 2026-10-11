// AI取り込み失敗の理由ごとのフィードバック文言 — React非依存の純粋モジュール
import type { AvatarImportError } from '@/utils/avatar/avatar-import-parser'

// 取り込み失敗の理由ごとに、何がなぜ駄目で次にどうすればよいかを伝えるフィードバック文言
const AVATAR_IMPORT_ERROR_MESSAGES: Record<AvatarImportError, string> = {
  invalidJson: '読み取れませんでした。\n指示文ではなく、JSONだけを貼り付けてください。',
  invalidKind: 'アバターデータではありません。\nもう一度生成して、JSONを貼り付けてください。',
  invalidHair: '髪型が見つかりませんでした。\n指示文のまま、もう一度生成してください。',
  invalidFace: '表情が見つかりませんでした。\n指示文のまま、もう一度生成してください。',
  invalidAccessory: 'アクセサリが見つかりません。\n指示文のまま、もう一度生成してください。',
  invalidOutfit: '服が見つかりませんでした。\n指示文のまま、もう一度生成してください。',
  invalidPalette: '色の指定が正しくありません。\n6桁のカラーコードが必要です（例: #2E1A09）。',
  pixelsInvalidSize: 'サイズが正しくありません。\n16x16のピクセルデータが必要です。',
  pixelsInvalidRows: '行列が正しくありません。\n16行×16文字のデータが必要です。',
  pixelsInvalidPalette:
    'カラーパレットが正しくありません。\n16進数カラーコード（例: #2E1A09）が必要です。',
}

// 失敗理由を文言へ変換。成功・未試行 (null) はそのまま null を返す
export const resolveAvatarImportErrorMessage = (error: AvatarImportError | null): string | null =>
  error ? AVATAR_IMPORT_ERROR_MESSAGES[error] : null
