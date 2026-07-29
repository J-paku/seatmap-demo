import { PartChipRow } from './PartChipRow'
import { SwatchRow } from './SwatchRow'
import {
  FACE_OPTIONS,
  HAIR_COLORS,
  HAIR_OPTIONS,
  OUTFIT_COLORS,
  OUTFIT_OPTIONS,
  SKIN_COLORS,
} from '../utils/avatar-options'
import type { AvatarConfig } from '@/lib/types'

// パーツと色の選択面。ヘア / スキン+フェイス / コスチュームの3グループ

type Props = {
  draft: AvatarConfig
  onPickHair: (hair: AvatarConfig['hair']) => void
  onPickFace: (face: AvatarConfig['face']) => void
  onPickOutfit: (outfit: AvatarConfig['outfit']) => void
  onPickHairColor: (color: string) => void
  onPickSkinColor: (color: string) => void
  onPickOutfitColor: (color: string) => void
}

export const PartsPanel = ({
  draft,
  onPickHair,
  onPickFace,
  onPickOutfit,
  onPickHairColor,
  onPickSkinColor,
  onPickOutfitColor,
}: Props) => (
  <>
    <div className='ac-group'>
      <PartChipRow
        label='ヘア'
        options={HAIR_OPTIONS}
        current={draft.hair}
        render={(opt) => ({ ...draft, hair: opt })}
        onPick={onPickHair}
      />
      <SwatchRow label='ヘアカラー' colors={HAIR_COLORS} current={draft.palette.hair} onPick={onPickHairColor} />
    </div>

    <div className='ac-group'>
      <SwatchRow label='スキン' colors={SKIN_COLORS} current={draft.palette.skin} onPick={onPickSkinColor} />
      <PartChipRow
        label='フェイス'
        options={FACE_OPTIONS}
        current={draft.face}
        render={(opt) => ({ ...draft, face: opt })}
        onPick={onPickFace}
      />
    </div>

    <div className='ac-group'>
      <PartChipRow
        label='コスチューム'
        options={OUTFIT_OPTIONS}
        current={draft.outfit}
        render={(opt) => ({ ...draft, outfit: opt })}
        onPick={onPickOutfit}
      />
      <SwatchRow
        label='コスチュームカラー'
        colors={OUTFIT_COLORS}
        current={draft.palette.outfit}
        onPick={onPickOutfitColor}
      />
    </div>
  </>
)
