import type { AvatarConfig } from '@/types'
import type { AvatarPreset } from '../type'

// パーツ候補・色パレット・クイックスタートのプリセット

export const HAIR_OPTIONS: AvatarConfig['hair'][] = ['short', 'long', 'bob', 'ponytail', 'bald']
export const FACE_OPTIONS: AvatarConfig['face'][] = ['smile', 'closed', 'serious', 'wink']
export const OUTFIT_OPTIONS: AvatarConfig['outfit'][] = ['suit', 'shirt', 'hoodie', 'knit']

export const HAIR_COLORS = ['#1F1B16', '#3B2B20', '#4A3728', '#6B4A2E', '#8C6239', '#B3B3B8', '#C2452F', '#4B3A6E']
export const SKIN_COLORS = ['#F6D7B8', '#F1C9A5', '#E0A97F', '#C68A5A', '#8C5A33']
export const OUTFIT_COLORS = ['#2F3B52', '#5B6B84', '#7C9E6F', '#B0552F', '#8A3B4A', '#3E7C7B', '#6E5AA0', '#4A4A4F']

export const PRESETS: AvatarPreset[] = [
  {
    id: 'male',
    label: '男性',
    config: { hair: 'short', face: 'smile', outfit: 'suit', palette: { hair: '#3B2B20', skin: '#F1C9A5', outfit: '#2F3B52' } },
  },
  {
    id: 'female',
    label: '女性',
    config: { hair: 'bob', face: 'wink', outfit: 'shirt', palette: { hair: '#4A3728', skin: '#F6D7B8', outfit: '#7C9E6F' } },
  },
]

// draft がプリセットと完全一致するか(一致すればそのチップを選択表示にする)
export const matchPresetId = (draft: AvatarConfig): string | null => {
  const match = PRESETS.find(
    (p) =>
      p.config.hair === draft.hair &&
      p.config.face === draft.face &&
      p.config.outfit === draft.outfit &&
      p.config.palette.hair === draft.palette.hair &&
      p.config.palette.skin === draft.palette.skin &&
      p.config.palette.outfit === draft.palette.outfit
  )
  return match?.id ?? null
}
