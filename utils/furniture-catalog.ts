// 家具のカタログ(表示名・既定サイズ・ピッカーのグループ分け)。副作用のない定数だけを持つ。
// 型は types/index.ts、当たり判定は utils/layout-objects.ts が担当する
import type { FurnitureKind } from '@/types'

// 種別の分類。Record なので種別を1つ足すとここが不足してコンパイルが落ちる。
// 「建設設備かどうか」の判定基準をこの1箇所に閉じ込め、名前の有無とグループ分けを両方ここから導く
const FURNITURE_CATEGORY: Record<FurnitureKind, 'structural' | 'object'> = {
  wall: 'structural',
  column: 'structural',
  stairs: 'structural',
  door: 'structural',
  window: 'structural',
  sofa: 'object',
  table: 'object',
  shelf: 'object',
  plant: 'object',
  bed: 'object',
}

const ALL_KINDS = Object.keys(FURNITURE_CATEGORY) as FurnitureKind[]

const kindsOf = (category: 'structural' | 'object'): FurnitureKind[] =>
  ALL_KINDS.filter((kind) => FURNITURE_CATEGORY[kind] === category)

export const FURNITURE_KIND_LABEL: Record<FurnitureKind, string> = {
  wall: '壁',
  column: '柱',
  stairs: '階段',
  door: 'ドア',
  window: '窓',
  sofa: 'ソファ',
  table: 'テーブル',
  shelf: '棚',
  plant: '植物',
  bed: 'ベッド',
}

export const FURNITURE_DEFAULT_SIZE: Record<FurnitureKind, { width: number; height: number }> = {
  wall: { width: 200, height: 20 },
  column: { width: 40, height: 40 },
  stairs: { width: 80, height: 80 },
  door: { width: 60, height: 20 },
  window: { width: 200, height: 20 },
  sofa: { width: 120, height: 60 },
  table: { width: 110, height: 70 },
  shelf: { width: 100, height: 40 },
  plant: { width: 50, height: 50 },
  bed: { width: 90, height: 120 },
}

export const isStructuralKind = (kind: FurnitureKind): boolean => FURNITURE_CATEGORY[kind] === 'structural'

// 家具ピッカーの見出しと並び
export const FURNITURE_LIBRARY_GROUPS: readonly { label: string; kinds: readonly FurnitureKind[] }[] = [
  { label: '建設設備', kinds: kindsOf('structural') },
  { label: 'オブジェクト', kinds: kindsOf('object') },
]

// 追加時の初期名。建設設備は空文字、オブジェクトは種別ラベルをそのまま入れる
export const defaultFurnitureName = (kind: FurnitureKind): string =>
  isStructuralKind(kind) ? '' : FURNITURE_KIND_LABEL[kind]
