// アバターのパーツ構成 (hair/face/accessory/outfit/palette/色上書き) の状態管理
// パーツが変化したら onPartsMutate を呼び、呼び出し側 (AI自由ピクセルの破棄など) に通知する
import { useCallback, useMemo, useState } from 'react'
import { PIXEL_AVATAR_PRESETS } from '@/lib/avatar/pixel-avatar-presets'
import { deriveOutfitColors } from '@/lib/avatar/avatar-color-utils'
import {
  ACCESSORY_OPTIONS,
  FACE_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_OPTION_GROUPS,
  OUTFIT_COLOR_OPTIONS,
  OUTFIT_OPTIONS,
  PALETTE_OPTIONS,
  QUICK_START_PRESETS,
  getExclusiveHairQuickStart,
  type QuickStartKind,
} from '@/lib/avatar/avatar-customizer-options'
import {
  deriveInitialParts,
  deriveInitialQuickStartKind,
  type DerivedInitialState,
} from '@/lib/avatar/avatar-initial-state'
import type {
  AccessoryId,
  AvatarPalette,
  FaceId,
  HairId,
  OutfitId,
  PartsAvatarConfig,
  PixelAvatarConfig,
  PixelAvatarPresetId,
} from '@/types'

export interface PartsState {
  hair: HairId
  face: FaceId
  accessory: AccessoryId
  outfit: OutfitId
  paletteId: PixelAvatarPresetId
  palette: AvatarPalette
  hairColor: string
  outfitColor: string
  currentConfig: PartsAvatarConfig
}

export interface PartsOptions {
  hairOptions: HairId[]
  faceOptions: FaceId[]
  accessoryOptions: AccessoryId[]
  outfitOptions: OutfitId[]
  paletteOptions: PixelAvatarPresetId[]
  hairColorOptions: string[]
  outfitColorOptions: string[]
}

export interface PartsSetters {
  setHair: (next: HairId) => void
  setFace: (next: FaceId) => void
  setAccessory: (next: AccessoryId) => void
  setOutfit: (next: OutfitId) => void
  setPaletteId: (next: PixelAvatarPresetId) => void
  setHairColor: (next: string) => void
  setOutfitColor: (next: string) => void
}

interface UsePartsModelArgs {
  initialConfig?: PixelAvatarConfig | null
  // パーツが変化したタイミングで呼ばれる (AI自由ピクセルの破棄など副作用の通知用)
  onPartsMutate: () => void
}

interface UsePartsModelResult {
  partsState: PartsState
  partsOptions: PartsOptions
  partsSetters: PartsSetters
  currentConfig: PartsAvatarConfig
  applyQuickStart: (kind: QuickStartKind) => void
  applyKuroxxx: () => void
  // 派生状態 (取り込み config・初期化) をパーツ構成へ反映
  applyDerivedConfig: (next: DerivedInitialState) => void
  // パーツ構成を初期状態へ戻す
  resetParts: () => void
}

export const usePartsModel = ({
  initialConfig,
  onPartsMutate,
}: UsePartsModelArgs): UsePartsModelResult => {
  const initial = useMemo(() => deriveInitialParts(initialConfig), [initialConfig])
  const initialQuickStartKind = useMemo(
    () => deriveInitialQuickStartKind(initialConfig, initial.parts.hair),
    [initial.parts.hair, initialConfig]
  )

  const [hair, setHairState] = useState<HairId>(initial.parts.hair)
  const [face, setFace] = useState<FaceId>(initial.parts.face)
  const [accessory, setAccessory] = useState<AccessoryId>(initial.parts.accessory ?? 'none')
  const [outfit, setOutfit] = useState<OutfitId>(initial.parts.outfit)
  const [paletteId, setPaletteIdState] = useState<PixelAvatarPresetId>(initial.paletteId)
  const [hairColorOverride, setHairColorOverride] = useState<string | null>(initial.hairColor)
  const [outfitColorOverride, setOutfitColorOverride] = useState<string | null>(initial.outfitColor)
  const [activeQuickStartKind, setActiveQuickStartKind] =
    useState<QuickStartKind>(initialQuickStartKind)

  // パレット基準色に髪色・服色の単色上書きを重ねた最終パレット
  const basePalette = PIXEL_AVATAR_PRESETS[paletteId].palette
  const palette: AvatarPalette = {
    ...basePalette,
    ...(hairColorOverride ? { hair: hairColorOverride } : {}),
    ...(outfitColorOverride ? deriveOutfitColors(outfitColorOverride) : {}),
  }
  const hairColor = palette.hair
  const outfitColor = palette.outfit
  const hairOptions = useMemo(
    () => [...HAIR_OPTION_GROUPS.common, ...HAIR_OPTION_GROUPS[activeQuickStartKind]],
    [activeQuickStartKind]
  )

  // 派生状態をパーツへ反映。fallbackQuickStartKind は髪型から確定できない場合の既定値
  const applyDerivedState = useCallback(
    (next: DerivedInitialState, fallbackQuickStartKind: QuickStartKind) => {
      onPartsMutate()
      setHairState(next.parts.hair)
      setFace(next.parts.face)
      setAccessory(next.parts.accessory ?? 'none')
      setOutfit(next.parts.outfit)
      setPaletteIdState(next.paletteId)
      setHairColorOverride(next.hairColor)
      setOutfitColorOverride(next.outfitColor)
      setActiveQuickStartKind(getExclusiveHairQuickStart(next.parts.hair) ?? fallbackQuickStartKind)
    },
    [onPartsMutate]
  )

  // 取り込み config の反映 — 現在の QuickStart 種別を fallback に使う
  const applyDerivedConfig = useCallback(
    (next: DerivedInitialState) => {
      applyDerivedState(next, activeQuickStartKind)
    },
    [applyDerivedState, activeQuickStartKind]
  )

  const resetParts = useCallback(() => {
    applyDerivedState(deriveInitialParts(null), 'male')
  }, [applyDerivedState])

  // パレット変更時は単色上書きをリセットし、選んだパレットの色に戻す
  const setPaletteId = useCallback(
    (next: PixelAvatarPresetId) => {
      onPartsMutate()
      setPaletteIdState(next)
      setHairColorOverride(null)
      setOutfitColorOverride(null)
    },
    [onPartsMutate]
  )

  const setHairColor = useCallback(
    (next: string) => {
      onPartsMutate()
      setHairColorOverride(next)
    },
    [onPartsMutate]
  )

  const setOutfitColor = useCallback(
    (next: string) => {
      onPartsMutate()
      setOutfitColorOverride(next)
    },
    [onPartsMutate]
  )

  const setHair = useCallback(
    (next: HairId) => {
      onPartsMutate()
      const exclusiveKind = getExclusiveHairQuickStart(next)
      if (exclusiveKind) {
        setActiveQuickStartKind(exclusiveKind)
      }
      setHairState(next)
    },
    [onPartsMutate]
  )

  const currentConfig: PartsAvatarConfig = useMemo(
    () => ({
      kind: 'parts',
      hair,
      face,
      accessory,
      outfit,
      palette,
    }),
    [hair, face, accessory, outfit, palette]
  )

  const applyQuickStart = useCallback(
    (kind: QuickStartKind) => {
      onPartsMutate()
      const preset = QUICK_START_PRESETS[kind]
      setActiveQuickStartKind(kind)
      setHairState(preset.hair)
      setFace(preset.face)
      setAccessory(preset.accessory)
      setOutfit(preset.outfit)
      setPaletteId(preset.paletteId)
    },
    [onPartsMutate, setPaletteId]
  )

  // ヒドル降臨 — クロミプリセット (av18) を全パーツに一括適用
  const applyKuroxxx = useCallback(() => {
    onPartsMutate()
    setActiveQuickStartKind('female')
    setHairState('kuroxxx')
    setFace('slit')
    setAccessory('bow')
    setOutfit('suit')
    setPaletteIdState('av18')
    setHairColorOverride(null)
    setOutfitColorOverride(null)
  }, [onPartsMutate])

  const partsState = useMemo(
    () => ({
      hair,
      face,
      accessory,
      outfit,
      paletteId,
      palette,
      hairColor,
      outfitColor,
      currentConfig,
    }),
    [hair, face, accessory, outfit, paletteId, palette, hairColor, outfitColor, currentConfig]
  )

  const partsOptions = useMemo(
    () => ({
      hairOptions,
      faceOptions: FACE_OPTIONS,
      accessoryOptions: ACCESSORY_OPTIONS,
      outfitOptions: OUTFIT_OPTIONS,
      paletteOptions: PALETTE_OPTIONS,
      hairColorOptions: HAIR_COLOR_OPTIONS,
      outfitColorOptions: OUTFIT_COLOR_OPTIONS,
    }),
    [hairOptions]
  )

  const partsSetters = useMemo(
    () => ({
      setHair,
      // raw setter はパーツ変更を通知してから state を更新
      setFace: (next: FaceId) => {
        onPartsMutate()
        setFace(next)
      },
      setAccessory: (next: AccessoryId) => {
        onPartsMutate()
        setAccessory(next)
      },
      setOutfit: (next: OutfitId) => {
        onPartsMutate()
        setOutfit(next)
      },
      setPaletteId,
      setHairColor,
      setOutfitColor,
    }),
    [setHair, setPaletteId, setHairColor, setOutfitColor, onPartsMutate]
  )

  return {
    partsState,
    partsOptions,
    partsSetters,
    currentConfig,
    applyQuickStart,
    applyKuroxxx,
    applyDerivedConfig,
    resetParts,
  }
}
