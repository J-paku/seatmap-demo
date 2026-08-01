// ヘア/フェイス/アクセ/コスチューム/カラーのパーツオプション群 (カラー+スタイルはグループ枠で1まとめ)
import type { CSSProperties } from 'react'
import { PIXEL_AVATAR_PRESETS } from '@/lib/avatar/pixel-avatar-presets'
import {
  ACCESSORY_LABELS,
  FACE_LABELS,
  HAIR_LABELS,
} from '@/lib/avatar/part-registry'
import { OptionRow } from '../components/OptionRow'
import { ColorSwatchRow } from '../components/ColorSwatchRow'
import { MiniPreview } from '../components/MiniPreview'
import type {
  AccessoryId,
  FaceId,
  HairId,
  OutfitId,
  PartsAvatarConfig,
  PixelAvatarPresetId,
} from '@/types'

interface PartsState {
  hair: HairId
  face: FaceId
  accessory: AccessoryId
  outfit: OutfitId
  paletteId: PixelAvatarPresetId
  hairColor: string
  outfitColor: string
  currentConfig: PartsAvatarConfig
}

interface PartsOptions {
  hairOptions: HairId[]
  faceOptions: FaceId[]
  accessoryOptions: AccessoryId[]
  outfitOptions: OutfitId[]
  paletteOptions: PixelAvatarPresetId[]
  hairColorOptions: string[]
  outfitColorOptions: string[]
}

interface PartsSetters {
  setHair: (id: HairId) => void
  setFace: (id: FaceId) => void
  setAccessory: (id: AccessoryId) => void
  setOutfit: (id: OutfitId) => void
  setPaletteId: (id: PixelAvatarPresetId) => void
  setHairColor: (color: string) => void
  setOutfitColor: (color: string) => void
}

interface PartsSectionProps {
  state: PartsState
  options: PartsOptions
  setters: PartsSetters
}

const ROWS_WRAPPER_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  rowGap: 14,
  width: '100%',
  minWidth: 0,
}

// カラー + スタイルを 1 つにまとめるグループ枠
const GROUP_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  rowGap: 10,
  width: '100%',
  minWidth: 0,
  padding: 12,
  borderRadius: 12,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-sunken)',
}

const GROUP_LABEL_STYLE: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'var(--color-text-secondary)',
}

const buildPreviewConfig = (
  current: PartsAvatarConfig,
  override: Partial<PartsAvatarConfig>
): PartsAvatarConfig => ({
  ...current,
  ...override,
})

export function PartsSection({ state, options, setters }: PartsSectionProps) {
  const { currentConfig, hair, face, accessory, outfit, paletteId, hairColor, outfitColor } = state
  const {
    hairOptions,
    faceOptions,
    accessoryOptions,
    outfitOptions,
    paletteOptions,
    hairColorOptions,
    outfitColorOptions,
  } = options
  const { setHair, setFace, setAccessory, setOutfit, setPaletteId, setHairColor, setOutfitColor } =
    setters

  return (
    <div style={ROWS_WRAPPER_STYLE}>
      <div style={GROUP_STYLE}>
        <span style={GROUP_LABEL_STYLE}>ヘア</span>
        <ColorSwatchRow
          ariaLabel='ヘアカラー'
          colors={hairColorOptions}
          selected={hairColor}
          onSelect={setHairColor}
        />
        <OptionRow
          hideLabel
          label='ヘア'
          selectedId={hair}
          onSelect={id => setHair(id as HairId)}
          options={hairOptions.map(id => ({
            id,
            preview: <MiniPreview config={buildPreviewConfig(currentConfig, { hair: id })} />,
            label: HAIR_LABELS[id],
          }))}
        />
      </div>

      <OptionRow
        label='フェイス'
        selectedId={face}
        onSelect={id => setFace(id as FaceId)}
        options={faceOptions.map(id => ({
          id,
          preview: <MiniPreview config={buildPreviewConfig(currentConfig, { face: id })} />,
          label: FACE_LABELS[id],
        }))}
      />

      <OptionRow
        label='アクセサリ'
        selectedId={accessory}
        onSelect={id => setAccessory(id as AccessoryId)}
        options={accessoryOptions.map(id => ({
          id,
          preview: <MiniPreview config={buildPreviewConfig(currentConfig, { accessory: id })} />,
          label: ACCESSORY_LABELS[id] ?? id,
        }))}
      />

      <div style={GROUP_STYLE}>
        <span style={GROUP_LABEL_STYLE}>コスチューム</span>
        <ColorSwatchRow
          ariaLabel='コスチュームカラー'
          colors={outfitColorOptions}
          selected={outfitColor}
          onSelect={setOutfitColor}
        />
        <OptionRow
          hideLabel
          label='コスチューム'
          selectedId={outfit}
          onSelect={id => setOutfit(id as OutfitId)}
          options={outfitOptions.map(id => ({
            id,
            preview: <MiniPreview config={buildPreviewConfig(currentConfig, { outfit: id })} />,
            label: `コスチューム ${id}`,
          }))}
        />
      </div>

      <OptionRow
        label='スタイル'
        selectedId={paletteId}
        onSelect={id => setPaletteId(id as PixelAvatarPresetId)}
        options={paletteOptions.map(id => ({
          id,
          preview: (
            <MiniPreview
              config={buildPreviewConfig(currentConfig, {
                palette: PIXEL_AVATAR_PRESETS[id].palette,
              })}
            />
          ),
          label: `スタイル ${id}`,
        }))}
      />
    </div>
  )
}

export default PartsSection
