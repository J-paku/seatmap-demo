// クイック開始オプション行
import { useMemo } from 'react'
import { PIXEL_AVATAR_PRESETS } from '@/lib/avatar/pixel-avatar-presets'
import { OptionRow } from '../components/OptionRow'
import { MiniPreview } from '../components/MiniPreview'
import { useAvatarCustomizer, type QuickStartKind } from '../hooks/use-avatar-customizer'
import type {
  AccessoryId,
  FaceId,
  HairId,
  OutfitId,
  PixelAvatarPresetId,
} from '@/types'

interface QuickStartSectionProps {
  hair: HairId
  face: FaceId
  accessory: AccessoryId
  outfit: OutfitId
  paletteId: PixelAvatarPresetId
  quickStartPresets: ReturnType<typeof useAvatarCustomizer>['quickStartPresets']
  applyQuickStart: (kind: QuickStartKind) => void
}

export function QuickStartSection({
  hair,
  face,
  accessory,
  outfit,
  paletteId,
  quickStartPresets,
  applyQuickStart,
}: QuickStartSectionProps) {
  const quickStartOptions = useMemo(
    () => [
      {
        id: 'male' as const,
        label: '男性',
        previewConfig: {
          kind: 'parts' as const,
          hair: quickStartPresets.male.hair,
          face: quickStartPresets.male.face,
          accessory: quickStartPresets.male.accessory,
          outfit: quickStartPresets.male.outfit,
          palette: PIXEL_AVATAR_PRESETS[quickStartPresets.male.paletteId].palette,
        },
      },
      {
        id: 'female' as const,
        label: '女性',
        previewConfig: {
          kind: 'parts' as const,
          hair: quickStartPresets.female.hair,
          face: quickStartPresets.female.face,
          accessory: quickStartPresets.female.accessory,
          outfit: quickStartPresets.female.outfit,
          palette: PIXEL_AVATAR_PRESETS[quickStartPresets.female.paletteId].palette,
        },
      },
    ],
    [quickStartPresets]
  )

  const selectedQuickStart: QuickStartKind | null = (() => {
    for (const option of quickStartOptions) {
      const preset = quickStartPresets[option.id]
      if (
        hair === preset.hair &&
        face === preset.face &&
        accessory === preset.accessory &&
        outfit === preset.outfit &&
        paletteId === preset.paletteId
      ) {
        return option.id
      }
    }
    return null
  })()

  return (
    <OptionRow
      label=''
      selectedId={selectedQuickStart ?? ''}
      onSelect={id => applyQuickStart(id as QuickStartKind)}
      showOptionLabels
      options={quickStartOptions.map(option => ({
        id: option.id,
        preview: <MiniPreview config={option.previewConfig} />,
        label: option.label,
      }))}
    />
  )
}

export default QuickStartSection
