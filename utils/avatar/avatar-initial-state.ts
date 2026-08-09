// initialConfig からカスタマイザ初期状態 (parts/paletteId/単色上書き/クイック開始種別) を導出する純粋関数群
import { PIXEL_AVATAR_PRESETS, resolveAvatarConfig } from './pixel-avatar-presets'
import {
  ACCESSORY_OPTIONS,
  FACE_OPTIONS,
  HAIR_OPTIONS,
  OUTFIT_OPTIONS,
  PALETTE_OPTIONS,
  QUICK_START_PRESETS,
  getExclusiveHairQuickStart,
  normalizeHairId,
  type QuickStartKind,
} from './avatar-customizer-options'
import type {
  HairId,
  PartsAvatarConfig,
  PixelAvatarConfig,
  PixelAvatarPresetId,
} from '@/types'

// 初期状態の導出結果
export interface DerivedInitialState {
  parts: PartsAvatarConfig
  paletteId: PixelAvatarPresetId
  hairColor: string | null
  outfitColor: string | null
}

// initialConfig と髪型から初期クイック開始種別を決める
export const deriveInitialQuickStartKind = (
  initialConfig: PixelAvatarConfig | null | undefined,
  hair: HairId
): QuickStartKind => {
  // preset 対象の場合は QUICK_START_PRESETS メタデータで kind を判定
  if (initialConfig?.kind === 'preset') {
    // preset id と QUICK_START_PRESETS の paletteId で照合してクイック開始種別を逆引き
    for (const [kind, preset] of Object.entries(QUICK_START_PRESETS)) {
      if (preset.paletteId === initialConfig.id) {
        return kind as QuickStartKind
      }
    }
  }

  const exclusiveKind = getExclusiveHairQuickStart(hair)
  if (exclusiveKind) {
    return exclusiveKind
  }

  return 'male'
}

// initialConfig から初期 parts を導出 (resolveAvatarConfig 再利用)
export const deriveInitialParts = (
  initialConfig: PixelAvatarConfig | null | undefined
): DerivedInitialState => {
  // initialConfig がない場合は各項目の0番インデックスで初期化
  if (!initialConfig) {
    const defaultPalette = PIXEL_AVATAR_PRESETS[PALETTE_OPTIONS[0]].palette
    return {
      parts: {
        kind: 'parts' as const,
        hair: HAIR_OPTIONS[0],
        face: FACE_OPTIONS[0],
        accessory: ACCESSORY_OPTIONS[0],
        outfit: OUTFIT_OPTIONS[0],
        palette: defaultPalette,
      },
      paletteId: PALETTE_OPTIONS[0],
      hairColor: null,
      outfitColor: null,
    }
  }

  const parts = resolveAvatarConfig(initialConfig)
  const normalizedHair = normalizeHairId(parts.hair as string)
  // 初期パレット ID は preset から判定。parts 直渡しの場合はパレット一致 av を探す or av1 fallback
  let paletteId: PixelAvatarPresetId = 'av1'
  if (initialConfig && initialConfig.kind === 'preset') {
    paletteId = initialConfig.id
  } else {
    const matched = PALETTE_OPTIONS.find(
      id =>
        PIXEL_AVATAR_PRESETS[id].palette.hair === parts.palette.hair &&
        PIXEL_AVATAR_PRESETS[id].palette.outfit === parts.palette.outfit
    )
    if (matched) {
      paletteId = matched
    }
  }
  // パレット基準色と異なれば「単色上書き」とみなして初期値に保持
  const presetPalette = PIXEL_AVATAR_PRESETS[paletteId].palette
  const hairColor = parts.palette.hair !== presetPalette.hair ? parts.palette.hair : null
  const outfitColor = parts.palette.outfit !== presetPalette.outfit ? parts.palette.outfit : null
  return {
    parts: {
      ...parts,
      hair: normalizedHair,
    },
    paletteId,
    hairColor,
    outfitColor,
  }
}
