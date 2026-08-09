// プリセット定義 — parts 合成型の組み合わせを 1 エントリで表現
// バリエーション追加は PIXEL_AVATAR_PRESETS に 1 行 + types の union に id 1 つ
import type {
  PartsAvatarConfig,
  PixelAvatarConfig,
  PixelAvatarPresetId,
} from '@/types'

export const PIXEL_AVATAR_PRESETS: Record<PixelAvatarPresetId, PartsAvatarConfig> = {
  av1: {
    kind: 'parts',
    hair: 'short',
    face: 'slit',
    outfit: 'solid',
    palette: {
      hair: '#2A1A0F',
      skin: '#F0C49A',
      outfit: '#3B6EA8',
      outfitDark: '#2C4F7A',
    },
  },
  av2: {
    kind: 'parts',
    hair: 'short',
    face: 'slit',
    outfit: 'solid',
    palette: {
      hair: '#5C3A1E',
      skin: '#F0C49A',
      outfit: '#A4392E',
      outfitDark: '#7A2A20',
    },
  },
  av3: {
    kind: 'parts',
    hair: 'mohawk',
    face: 'serious',
    outfit: 'striped',
    palette: {
      hair: '#1A1A1A',
      skin: '#E8B486',
      outfit: '#356645',
      outfitDark: '#274A33',
      outfitAlt: '#4D8861',
    },
  },
  av4: {
    kind: 'parts',
    hair: 'long',
    face: 'smile',
    outfit: 'solid',
    palette: {
      hair: '#3A2A4A',
      skin: '#F0C49A',
      outfit: '#634274',
      outfitDark: '#4A3258',
    },
  },
  av5: {
    kind: 'parts',
    hair: 'curl',
    face: 'smile',
    outfit: 'suit',
    palette: {
      hair: '#D4A642',
      skin: '#F0C49A',
      outfit: '#D4A030',
      outfitDark: '#A87A1A',
      outfitAlt: '#FFFFFF',
    },
  },
  av6: {
    kind: 'parts',
    hair: 'bald',
    face: 'serious',
    accessory: 'glasses',
    outfit: 'suit',
    palette: {
      hair: '#5A5A60',
      skin: '#E8C8A8',
      outfit: '#787880',
      outfitDark: '#5A5A60',
      outfitAlt: '#FFFFFF',
      accessory: '#1A1A1A',
    },
  },
  av7: {
    kind: 'parts',
    hair: 'short',
    face: 'closed',
    accessory: 'glasses',
    outfit: 'hoodie',
    palette: {
      hair: '#1A1A1A',
      skin: '#F0C49A',
      outfit: '#C76A4A',
      outfitDark: '#8B2F18',
      accessory: '#1A1A1A',
    },
  },
  av8: {
    kind: 'parts',
    hair: 'topknot',
    face: 'slit',
    outfit: 'solid',
    palette: {
      hair: '#5A4A38',
      skin: '#F0C49A',
      outfit: '#3E6648',
      outfitDark: '#2A4632',
    },
  },
  // 「役職持ち」レンジ — 白髪・サングラス・スーツ系
  av9: {
    kind: 'parts',
    hair: 'short',
    face: 'serious',
    accessory: 'sunglasses',
    outfit: 'suit',
    palette: {
      hair: '#E8E8EC',
      skin: '#E8C8A8',
      outfit: '#2A2522',
      outfitDark: '#1A1714',
      outfitAlt: '#C76A4A',
      accessory: '#1A1A1A',
    },
  },
  av10: {
    kind: 'parts',
    hair: 'bald',
    face: 'serious',
    accessory: 'sunglasses',
    outfit: 'suit',
    palette: {
      hair: '#5A5A60',
      skin: '#D8B898',
      outfit: '#3A332D',
      outfitDark: '#2A2520',
      outfitAlt: '#E8DFD3',
      accessory: '#1A1A1A',
    },
  },
  av11: {
    kind: 'parts',
    hair: 'long',
    face: 'closed',
    accessory: 'glasses',
    outfit: 'suit',
    palette: {
      hair: '#D8D8DC',
      skin: '#E8C8A8',
      outfit: '#4A4239',
      outfitDark: '#2A2520',
      outfitAlt: '#FFFFFF',
      accessory: '#5A5A60',
    },
  },
  // タイ — 黒髪短め、温かみのある肌、暖色の服
  av12: {
    kind: 'parts',
    hair: 'short',
    face: 'smile',
    outfit: 'solid',
    palette: {
      hair: '#1F1610',
      skin: '#D8A076',
      outfit: '#D4862A',
      outfitDark: '#A86A1A',
    },
  },
  // 韓国 — 落ち着いた短髪、明るめの肌
  av13: {
    kind: 'parts',
    hair: 'short',
    face: 'slit',
    outfit: 'solid',
    palette: {
      hair: '#1A1410',
      skin: '#EEBD92',
      outfit: '#2A4F6E',
      outfitDark: '#1A3A52',
    },
  },
  // 日本 — おかっぱ (ボブ) + 落ち着いた藍色
  av14: {
    kind: 'parts',
    hair: 'bob',
    face: 'slit',
    outfit: 'solid',
    palette: {
      hair: '#1A1410',
      skin: '#F0C49A',
      outfit: '#2A5570',
      outfitDark: '#1A3A52',
    },
  },
  // ナチュラルショートボブ + 暗めの肌 + 鮮やかな縞柄
  av15: {
    kind: 'parts',
    hair: 'neatBob',
    face: 'smile',
    outfit: 'striped',
    palette: {
      hair: '#1A0F08',
      skin: '#6A4A38',
      outfit: '#D4862A',
      outfitDark: '#A86A1A',
      outfitAlt: '#E8B45A',
    },
  },
  // インド — 短い黒髪 + 中明度肌
  av16: {
    kind: 'parts',
    hair: 'short',
    face: 'slit',
    outfit: 'solid',
    palette: {
      hair: '#2A1810',
      skin: '#B07850',
      outfit: '#A4392E',
      outfitDark: '#7A2A20',
    },
  },
  // イングランド — ブラウンショート + 明るい肌
  av17: {
    kind: 'parts',
    hair: 'short',
    face: 'smile',
    outfit: 'solid',
    palette: {
      hair: '#8A5A2E',
      skin: '#F4D2A8',
      outfit: '#4A8A6E',
      outfitDark: '#2A6A50',
    },
  },
  // ヒドル専用プリセット — クロミ降臨イースターエッグ (↑3↓3↑7) 専用。トリガー組み合わせ(kuroxxx/bow/suit)は変更禁止
  // パレットはクロミ配色 — ピンクのフード / 黒い顔 / 紫の脚。横目線の立ち姿を色で表現する
  av18: {
    kind: 'parts',
    hair: 'kuroxxx',
    face: 'slit',
    accessory: 'bow',
    outfit: 'suit',
    palette: {
      hair: '#D9A1B2',
      skin: '#ECD6A6',
      outfit: '#6B4E86',
      outfitDark: '#46335E',
      outfitAlt: '#9C84A8',
      accessory: '#D9A1B2',
    },
  },
}

// バックエンド未保存ユーザーへのデフォルトアバター — 固定の単一プリセット (シード依存しない)
// 「未設定時はリセット値と同じ見た目」をすべての描画箇所で統一するための単一ソース
export const DEFAULT_AVATAR_PRESET_ID: PixelAvatarPresetId = 'av1'

// preset を parts に展開 — UI 側からはこの関数 1 つで設定を実体化
export const resolveAvatarConfig = (
  config: PixelAvatarConfig | null | undefined
): PartsAvatarConfig => {
  if (config && config.kind === 'parts') {
    return config
  }
  if (config && config.kind === 'preset') {
    const preset = PIXEL_AVATAR_PRESETS[config.id]
    // 存在しない、または削除された preset id の場合はデフォルトにフォールバック
    if (!preset) {
      return PIXEL_AVATAR_PRESETS[DEFAULT_AVATAR_PRESET_ID]
    }
    return preset
  }
  return PIXEL_AVATAR_PRESETS[DEFAULT_AVATAR_PRESET_ID]
}

// JSON 文字列のパース — preset / parts の両方に対応
