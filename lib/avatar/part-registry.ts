// アバターパーツメタデータレジストリ — 全パーツの label, aiDesc, グループを一元化
import type { AccessoryId, FaceId, HairId, OutfitId } from '@/types'

interface HairPartMeta {
  label: string
  aiDesc: string
  // hidden: イースターエッグ専用 — 選択肢グループ・AIオプション一覧に出さない
  group: 'common' | 'male' | 'female' | 'hidden'
}

interface FacePartMeta {
  label: string
  aiDesc: string
}

interface AccessoryPartMeta {
  label: string
  aiDesc: string
}

const HAIR_REGISTRY: Record<HairId, HairPartMeta> = {
  short: { label: 'ショート', aiDesc: '短髪', group: 'common' },
  long: { label: 'ロング', aiDesc: 'ロングヘア', group: 'common' },
  bald: { label: 'ボウズ', aiDesc: '坊主・スキンヘッド', group: 'common' },
  mohawk: { label: 'モヒカン', aiDesc: 'モヒカン', group: 'male' },
  topknot: { label: 'トップノット', aiDesc: 'お団子・ちょんまげ', group: 'male' },
  windSweep: { label: '風ヘア', aiDesc: '風に流した前髪', group: 'male' },
  garou: { label: '餓狼ヘア', aiDesc: '逆立った尖った髪・スパイキー', group: 'male' },
  curl: { label: 'カーリー', aiDesc: 'カール・天然パーマ', group: 'common' },
  neatBob: { label: 'ナチュラルボブ', aiDesc: '整ったボブ', group: 'common' },
  softBob: { label: 'ソフトボブ', aiDesc: '柔らかいボブ', group: 'common' },
  bob: { label: 'ボブ', aiDesc: '前下がりボブ', group: 'female' },
  ponytail: { label: 'ポニーテール', aiDesc: 'ポニーテール', group: 'female' },
  twintail: { label: 'ツインテール', aiDesc: 'ツインテール', group: 'female' },
  wavy: { label: 'ウェーブ', aiDesc: 'ウェーブヘア', group: 'common' },
  hime: { label: '姫カット', aiDesc: '姫カット', group: 'female' },
  hood: { label: 'フード', aiDesc: 'フードをかぶった頭', group: 'common' },
  bobBangs: { label: 'ぱっつんボブ', aiDesc: '前髪ありボブ', group: 'female' },
  wavyBangs: { label: '前髪ウェーブ', aiDesc: 'ウェーブ前髪', group: 'female' },
  longStraight: { label: 'センター分けロング', aiDesc: 'ストレートロング', group: 'female' },
  cCurlBob: { label: 'Cカールボブ', aiDesc: 'Cカールボブ', group: 'female' },
  kuroxxx: { label: 'ヒドル帽', aiDesc: 'クロミ風 (特殊)', group: 'hidden' },
}

const FACE_REGISTRY: Record<FaceId, FacePartMeta> = {
  slit: { label: 'クール', aiDesc: '細目・クール' },
  smile: { label: 'スマイル', aiDesc: '笑顔' },
  closed: { label: '目つぶり', aiDesc: '目を閉じた穏やかな顔' },
  serious: { label: 'マジメ', aiDesc: '真剣・真面目' },
  wink: { label: 'ウィンク', aiDesc: 'ウインク' },
  stern: { label: '眉強め', aiDesc: '厳しい・しかめ面' },
  smirk: { label: 'ニヤリ', aiDesc: 'ニヤリ' },
  happy: { label: 'ハッピー', aiDesc: 'にっこり嬉しい' },
}

const ACCESSORY_REGISTRY: Record<AccessoryId, AccessoryPartMeta> = {
  none: { label: 'なし', aiDesc: 'なし' },
  glasses: { label: 'メガネ', aiDesc: 'メガネ' },
  cap: { label: 'キャップ', aiDesc: 'キャップ帽' },
  mask: { label: 'マスク', aiDesc: 'マスク' },
  sunglasses: { label: 'サングラス', aiDesc: 'サングラス' },
  glassesThick: { label: '黒ぶち', aiDesc: '太縁メガネ' },
  glassesAviator: { label: 'とんぼ型', aiDesc: 'ティアドロップ型サングラス' },
  glassesRound: { label: '丸メガネ', aiDesc: '丸メガネ' },
  bow: { label: 'ピンクリボン', aiDesc: 'リボン' },
}

// 公開用: 各パーツ ID ごとに label / aiDesc を取得できるマップ
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
