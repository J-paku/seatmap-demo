// Haptic のタイプ定義
// 原文の hapticOn(window.webkit 経由の iOS ネイティブ呼び出し)はデモに型が無いため取り込まない(§4)
export type HapticType = 'light' | 'medium' | 'success' | 'error'

// カスタムイベントの型（Provider 内で使用）
export type HapticEvent = CustomEvent<HapticType>

// イベント名の定数
export const HAPTIC_EVENT_NAME = 'haptic'

/**
 * ハプティックのトリガー（どこからでも import なしで使用可能）
 * Provider がこのイベントを受け取り、実際のハプティックを実行する
 *
 * @example
 * triggerHaptic('light')
 * triggerHaptic('success')
 */
export const triggerHaptic = (type: HapticType = 'light') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<HapticType>(HAPTIC_EVENT_NAME, { detail: type }))
  }
}
