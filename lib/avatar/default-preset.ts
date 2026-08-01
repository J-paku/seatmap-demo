// 未設定社員の既定プリセット解決 — 原文 pixelAvatarPresets.ts の抜粋には含まれていなかったが、
// 原文 types.ts の Employee.avatarConfig コメントが「employee.id をシードに resolveDefaultPresetId が
// 割り当てる」と明記しているため、欠落分の補完としてデモ側で実装する。
// 原文ファイルを再抽出しても消えないよう、取り込んだ pixel-avatar-presets.ts とは別ファイルに置く。
import type { PixelAvatarPresetId } from '@/types'
import { hashStringToInt } from '@/utils/hash-string'
import { PIXEL_AVATAR_PRESETS, DEFAULT_AVATAR_PRESET_ID } from './pixel-avatar-presets'

// プリセット ID の並びはオブジェクトのキー順(av1..av18)に従う
const PRESET_IDS = Object.keys(PIXEL_AVATAR_PRESETS) as PixelAvatarPresetId[]

// 乗数31ハッシュは emp-001/emp-002 のような近い文字列で出力も近くなり、
// 剰余を取ると名簿上で連番の社員に連番のプリセットが並んでしまう。
// 剰余の前に一段撹拌して隣接シードを散らす(値は決定的なまま)
const avalanche = (value: number): number => {
  let x = value | 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  return (x ^ (x >>> 16)) | 0
}

// 同じ seed からは常に同じプリセットを返す(社員の顔が再読み込みで変わらない)
export const resolveDefaultPresetId = (seed: string): PixelAvatarPresetId => {
  if (PRESET_IDS.length === 0) return DEFAULT_AVATAR_PRESET_ID
  const index = Math.abs(avalanche(hashStringToInt(seed))) % PRESET_IDS.length
  return PRESET_IDS[index]
}
