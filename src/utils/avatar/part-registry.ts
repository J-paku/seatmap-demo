// アバターパーツメタデータレジストリ — 全パーツの label・グループを一元化
import type { AccessoryId, FaceId, HairId, OutfitId } from '@/types'

interface HairPartMeta {
  label: string
  // null: イースターエッグ専用 — 選択肢グループに出さない
  // (どのグループにも入らないことだけが意味を持つので、名前の文字列ではなく null で表す)
  group: 'common' | 'male' | 'female' | null
}

interface FacePartMeta {
  label: string
}

interface AccessoryPartMeta {
  label: string
}

const HAIR_REGISTRY: Record<HairId, HairPartMeta> = {
  short: { label: 'ショート', group: 'common' },
  long: { label: 'ロング', group: 'common' },
  bald: { label: 'ボウズ', group: 'common' },
  mohawk: { label: 'モヒカン', group: 'male' },
  topknot: { label: 'トップノット', group: 'male' },
  windSweep: { label: '風ヘア', group: 'male' },
  garou: { label: '餓狼ヘア', group: 'male' },
  curl: { label: 'カーリー', group: 'common' },
  neatBob: { label: 'ナチュラルボブ', group: 'common' },
  softBob: { label: 'ソフトボブ', group: 'common' },
  bob: { label: 'ボブ', group: 'female' },
  ponytail: { label: 'ポニーテール', group: 'female' },
  twintail: { label: 'ツインテール', group: 'female' },
  wavy: { label: 'ウェーブ', group: 'common' },
  hime: { label: '姫カット', group: 'female' },
  hood: { label: 'フード', group: 'common' },
  bobBangs: { label: 'ぱっつんボブ', group: 'female' },
  wavyBangs: { label: '前髪ウェーブ', group: 'female' },
  longStraight: { label: 'センター分けロング', group: 'female' },
  cCurlBob: { label: 'Cカールボブ', group: 'female' },
  kuroxxx: { label: 'ヒドル帽', group: null },
}

const FACE_REGISTRY: Record<FaceId, FacePartMeta> = {
  slit: { label: 'クール' },
  smile: { label: 'スマイル' },
  closed: { label: '目つぶり' },
  serious: { label: 'マジメ' },
  wink: { label: 'ウィンク' },
  stern: { label: '眉強め' },
  smirk: { label: 'ニヤリ' },
  happy: { label: 'ハッピー' },
}

const ACCESSORY_REGISTRY: Record<AccessoryId, AccessoryPartMeta> = {
  none: { label: 'なし' },
  glasses: { label: 'メガネ' },
  cap: { label: 'キャップ' },
  mask: { label: 'マスク' },
  sunglasses: { label: 'サングラス' },
  glassesThick: { label: '黒ぶち' },
  glassesAviator: { label: 'とんぼ型' },
  glassesRound: { label: '丸メガネ' },
  bow: { label: 'ピンクリボン' },
}

// 公開用: 各パーツ ID ごとに label を取得できるマップ
export const HAIR_LABELS: Record<HairId, string> = Object.fromEntries(
  Object.entries(HAIR_REGISTRY).map(([id, meta]) => [id, meta.label])
) as Record<HairId, string>

export const FACE_LABELS: Record<FaceId, string> = Object.fromEntries(
  Object.entries(FACE_REGISTRY).map(([id, meta]) => [id, meta.label])
) as Record<FaceId, string>

export const ACCESSORY_LABELS: Record<AccessoryId, string> = Object.fromEntries(
  Object.entries(ACCESSORY_REGISTRY).map(([id, meta]) => [id, meta.label])
) as Record<AccessoryId, string>

// HAIR_OPTION_GROUPS の派生: グループ分類から common/male/female に整理
export const HAIR_OPTION_GROUPS: {
  common: HairId[]
  male: HairId[]
  female: HairId[]
} = (() => {
  const common: HairId[] = []
  const male: HairId[] = []
  const female: HairId[] = []

  for (const [id, meta] of Object.entries(HAIR_REGISTRY)) {
    if (meta.group === 'common') common.push(id as HairId)
    else if (meta.group === 'male') male.push(id as HairId)
    else if (meta.group === 'female') female.push(id as HairId)
  }

  return { common, male, female }
})()

// *_OPTIONS 配列の派生: ID リスト（順序は元と保持）
export const HAIR_OPTIONS: HairId[] = [
  'short',
  'neatBob',
  'softBob',
  'longStraight',
  'long',
  'wavy',
  'curl',
  'hood',
  'bald',
  'bob',
  'bobBangs',
  'cCurlBob',
  'wavyBangs',
  'ponytail',
  'twintail',
  'hime',
  'topknot',
  'mohawk',
  'windSweep',
  'garou',
]

export const FACE_OPTIONS: FaceId[] = [
  'slit',
  'smile',
  'closed',
  'serious',
  'wink',
  'stern',
  'smirk',
  'happy',
]

export const ACCESSORY_OPTIONS: AccessoryId[] = [
  'none',
  'glasses',
  'cap',
  'mask',
  'sunglasses',
  'glassesThick',
  'glassesAviator',
  'glassesRound',
  'bow',
]

export const OUTFIT_OPTIONS: OutfitId[] = [
  'solid',
  'striped',
  'suit',
  'hoodie',
  'shirt',
  'blazer',
  'knit',
  'cardigan',
  'polo',
  'turtleneck',
  'vest',
]
