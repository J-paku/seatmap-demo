// アバターカスタマイザの選択肢定数とパーツ分類ユーティリティ — 純粋データ層
import { PIXEL_AVATAR_PRESETS } from './pixel-avatar-presets'
import {
  HAIR_OPTION_GROUPS as HAIR_OPTION_GROUPS_FROM_REGISTRY,
  HAIR_OPTIONS as HAIR_OPTIONS_FROM_REGISTRY,
  FACE_OPTIONS as FACE_OPTIONS_FROM_REGISTRY,
  ACCESSORY_OPTIONS as ACCESSORY_OPTIONS_FROM_REGISTRY,
  OUTFIT_OPTIONS as OUTFIT_OPTIONS_FROM_REGISTRY,
} from './part-registry'
import type {
  AccessoryId,
  FaceId,
  HairId,
  OutfitId,
  PixelAvatarPresetId,
} from '@/types'

// クイック開始テンプレート — ベース構成を一発適用するためのプリセット
export type QuickStartKind = 'male' | 'female'

export const QUICK_START_PRESETS: Record<
  QuickStartKind,
  {
    hair: HairId
    face: FaceId
    accessory: AccessoryId
    outfit: OutfitId
    paletteId: PixelAvatarPresetId
    kind: QuickStartKind
  }
> = {
  male: {
    hair: 'short',
    face: 'slit',
    accessory: 'none',
    outfit: 'solid',
    paletteId: 'av1',
    kind: 'male',
  },
  female: {
    hair: 'softBob',
    face: 'smile',
    accessory: 'none',
    outfit: 'solid',
    paletteId: 'av4',
    kind: 'female',
  },
}

// 髪色オプション — どうぶつの森風の自然なトーン (ナチュラル7色 + 柔らかいポイント3色)
export const HAIR_COLOR_OPTIONS: string[] = [
  '#1A1A1C',
  '#3D2B1F',
  '#6F4E37',
  '#A9744F',
  '#D2B16A',
  '#9A9AA0',
  '#E6E1D8',
  '#C56A52',
  '#E59AAE',
  '#6E8FB5',
]

// 服の色オプション — オフィスカジュアル寄りの落ち着いたトーン
export const OUTFIT_COLOR_OPTIONS: string[] = [
  '#3A3F4B',
  '#2E3A59',
  '#8A8F99',
  '#C7CBD1',
  '#ECEEF1',
  '#C2A06B',
  '#6E7355',
  '#7C3B43',
  '#7FA0C0',
  '#6B4F3A',
]

// Registry 由来で再エクスポート — 呼び出し側で同じ名前で使用可能
export const HAIR_OPTION_GROUPS = HAIR_OPTION_GROUPS_FROM_REGISTRY
export const HAIR_OPTIONS = HAIR_OPTIONS_FROM_REGISTRY
export const FACE_OPTIONS = FACE_OPTIONS_FROM_REGISTRY
export const ACCESSORY_OPTIONS = ACCESSORY_OPTIONS_FROM_REGISTRY
export const OUTFIT_OPTIONS = OUTFIT_OPTIONS_FROM_REGISTRY
export const PALETTE_OPTIONS = Object.keys(PIXEL_AVATAR_PRESETS) as PixelAvatarPresetId[]

// afro → neatBob 移行: 旧データ (Pleasanter 保存済み) の後方互換
export const normalizeHairId = (hair: string): HairId => {
  if (hair === 'afro') return 'neatBob'
  return hair as HairId
}

// 髪型から専用クイック開始種別を判定 (共通グループは null)
export const getExclusiveHairQuickStart = (hair: HairId): QuickStartKind | null => {
  if (HAIR_OPTION_GROUPS.male.includes(hair)) {
    return 'male'
  }
  if (HAIR_OPTION_GROUPS.female.includes(hair)) {
    return 'female'
  }
  return null
}
