// アナウンス文言の頭のタグとキーワードからトーストの色味を決める。トーストを出しておく時間もここに置く
export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export const TOAST_HIDE_DELAY = 2600

export function normalizeAnnouncement(rawMessage: string): { message: string; tone: ToastTone } {
  // 空文字はタグにもキーワードにも当たらないので、最後の info にそのまま落ちる
  const trimmed = rawMessage.trim()

  const tagMatch = trimmed.match(/^\[(success|warning|error|info)\]\s*/i)
  if (tagMatch) {
    const tone = tagMatch[1].toLowerCase() as ToastTone
    // 頭で一致したタグと直後の空白を、一致した長さぶん切り落とす
    const message = trimmed.slice(tagMatch[0].length)
    return { message, tone }
  }

  const errorKeywords = [
    'できません',
    '失敗',
    'エラー',
    '重な',
    '狭すぎ',
    'オフライン',
    '権限がない',
    '確認してください',
    'エリア外',
  ]
  if (errorKeywords.some(keyword => trimmed.includes(keyword))) {
    return { message: trimmed, tone: 'error' }
  }

  const warningKeywords = ['選択してください', 'ありません', '解除しました']
  if (warningKeywords.some(keyword => trimmed.includes(keyword))) {
    return { message: trimmed, tone: 'warning' }
  }

  const successKeywords = [
    '追加しました',
    '削除しました',
    '変更しました',
    '入れ替えました',
    '挿入しました',
    '移動しました',
    '選択しました',
  ]
  if (successKeywords.some(keyword => trimmed.includes(keyword))) {
    return { message: trimmed, tone: 'success' }
  }

  return { message: trimmed, tone: 'info' }
}
