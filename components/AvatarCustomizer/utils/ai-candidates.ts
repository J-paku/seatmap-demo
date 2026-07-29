import type { AvatarConfig } from '@/types'

// AI生成モックの固定候補12件(外見が重ならないようキュレーション)
export const AI_CANDIDATES: AvatarConfig[] = [
  { hair: 'short', face: 'serious', outfit: 'suit', palette: { hair: '#1F1B16', skin: '#F1C9A5', outfit: '#2F3B52' } },
  { hair: 'long', face: 'smile', outfit: 'knit', palette: { hair: '#6B4A2E', skin: '#F6D7B8', outfit: '#8A3B4A' } },
  { hair: 'bob', face: 'wink', outfit: 'shirt', palette: { hair: '#4A3728', skin: '#E0A97F', outfit: '#7C9E6F' } },
  { hair: 'ponytail', face: 'smile', outfit: 'hoodie', palette: { hair: '#3B2B20', skin: '#F1C9A5', outfit: '#3E7C7B' } },
  { hair: 'bald', face: 'closed', outfit: 'suit', palette: { hair: '#8C6239', skin: '#C68A5A', outfit: '#4A4A4F' } },
  { hair: 'short', face: 'wink', outfit: 'knit', palette: { hair: '#C2452F', skin: '#F6D7B8', outfit: '#6E5AA0' } },
  { hair: 'long', face: 'serious', outfit: 'shirt', palette: { hair: '#1F1B16', skin: '#8C5A33', outfit: '#5B6B84' } },
  { hair: 'bob', face: 'smile', outfit: 'hoodie', palette: { hair: '#B3B3B8', skin: '#F1C9A5', outfit: '#B0552F' } },
  { hair: 'ponytail', face: 'closed', outfit: 'suit', palette: { hair: '#4B3A6E', skin: '#E0A97F', outfit: '#2F3B52' } },
  { hair: 'short', face: 'smile', outfit: 'hoodie', palette: { hair: '#6B4A2E', skin: '#C68A5A', outfit: '#3E7C7B' } },
  { hair: 'bald', face: 'serious', outfit: 'knit', palette: { hair: '#4A3728', skin: '#F6D7B8', outfit: '#8A3B4A' } },
  { hair: 'long', face: 'wink', outfit: 'suit', palette: { hair: '#8C6239', skin: '#F1C9A5', outfit: '#6E5AA0' } },
]

// ローディング演出中に切り替わる2種の文言(合計1.5秒を等分)
export const AI_LOADING_MESSAGES = ['イメージを解析中…', 'ドットを配置中…']
export const AI_LOADING_MS = 1500

// 要望テキスト → 12候補のインデックス(同一テキスト=同一結果)
export const aiIndexOf = (text: string): number => {
  let sum = 0
  for (const ch of text) sum += ch.codePointAt(0) ?? 0
  return sum % AI_CANDIDATES.length
}
