// AI 生成コードからアバター構成を取り込む厳格パーサ — kind=parts と kind=pixels の2経路対応
// parts: 従来パレット合成 / pixels: 16x16 フリーピクセル + 自動充填正規化
import { HAIR_MATRICES } from './matrices/hair-matrices'
import { FACE_MATRICES } from './matrices/face-matrices'
import { ACCESSORY_MATRICES } from './matrices/accessory-matrices'
import { OUTFIT_MATRICES } from './matrices/outfit-matrices'
import { normalizeHairId } from './avatar-customizer-options'
import { deriveOutfitColors } from './avatar-color-utils'
import { normalizeFreePixelRows } from './avatar-free-pixel-mask'
import type {
  AccessoryId,
  AvatarPalette,
  FaceId,
  HairId,
  OutfitId,
  PartsAvatarConfig,
  PixelsAvatarConfig,
} from '@/types'

// 失敗理由 — UI 側で具体的なフィードバック文言にマッピングする
export type AvatarImportError =
  | 'invalidJson'
  | 'invalidKind'
  | 'invalidHair'
  | 'invalidFace'
  | 'invalidAccessory'
  | 'invalidOutfit'
  | 'invalidPalette'
  | 'pixelsInvalidSize'
  | 'pixelsInvalidRows'
  | 'pixelsInvalidPalette'

// 取り込み結果 — 成功なら正規化済み config、失敗なら理由のみ
export type AvatarImportResult =
  | { ok: true; config: PartsAvatarConfig | PixelsAvatarConfig }
  | { ok: false; error: AvatarImportError }

// JSON.parse の戻り値を any/unknown を使わず段階的に絞り込むための値型
interface JsonObject {
  [key: string]: JsonValue
}
type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

const isRecord = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asString = (value: JsonValue | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined

const asHex = (value: JsonValue | undefined): string | undefined => {
  const text = asString(value)
  return text && HEX_COLOR_PATTERN.test(text) ? text : undefined
}

const isHairId = (value: string): value is HairId => value in HAIR_MATRICES
const isFaceId = (value: string): value is FaceId => value in FACE_MATRICES
const isAccessoryId = (value: string): value is AccessoryId => value in ACCESSORY_MATRICES
const isOutfitId = (value: string): value is OutfitId => value in OUTFIT_MATRICES

const asArray = (value: JsonValue | undefined): JsonValue[] | undefined =>
  Array.isArray(value) ? value : undefined

// 入力「全体」が単一のコードフェンスで包まれている場合のみ中身を剥がす (^...$ で全体一致)
// 説明文や複数ブロックを含むテキスト (= プロンプト全文の貼り付け等) は剥がさず、そのまま JSON.parse に渡して失敗させる
const FENCED_BLOCK_PATTERN =
  /^```(?:json|ts|tsx|js|jsx|typescript|javascript)?\s*\n?([\s\S]*?)\n?```$/i

// 純粋 JSON、または単一フェンスで包んだ JSON だけを取り出す。それ以外は素のまま返す
const extractAiImportCode = (source: string): string => {
  const trimmed = source.trim()
  const match = trimmed.match(FENCED_BLOCK_PATTERN)
  return match ? match[1].trim() : trimmed
}

// 失敗ヘルパー — 呼び出し側の早期 return を読みやすくする
const fail = (error: AvatarImportError): AvatarImportResult => ({ ok: false, error })

// AI が返した文字列を厳格に検証する。kind 分岐で parts と pixels の2経路対応
export const parseAiImportedConfig = (source: string): AvatarImportResult => {
  let raw: JsonValue
  try {
    raw = JSON.parse(extractAiImportCode(source)) as JsonValue
  } catch {
    return fail('invalidJson')
  }

  // オブジェクト以外 (配列/数値/null 等) は取り込めない
  if (!isRecord(raw)) return fail('invalidJson')

  // kind による分岐 — parts または pixels
  const kind = asString(raw.kind)
  if (!kind) return fail('invalidKind')

  if (kind === 'parts') {
    return parsePartsConfig(raw)
  } else if (kind === 'pixels') {
    return parsePixelsConfig(raw)
  } else {
    return fail('invalidKind')
  }
}

// parts 経路 — 従来の パレット合成型
const parsePartsConfig = (raw: JsonObject): AvatarImportResult => {
  // 各パーツ: 文字列かつ既存 ID であることを必須とする
  const hairRaw = asString(raw.hair)
  const hair = hairRaw ? normalizeHairId(hairRaw) : ''
  if (!hair || !isHairId(hair)) return fail('invalidHair')

  const face = asString(raw.face)
  if (!face || !isFaceId(face)) return fail('invalidFace')

  const accessory = asString(raw.accessory)
  if (!accessory || !isAccessoryId(accessory)) return fail('invalidAccessory')

  const outfit = asString(raw.outfit)
  if (!outfit || !isOutfitId(outfit)) return fail('invalidOutfit')

  // パレット: hair / skin / outfit / outfitDark は必須 HEX。outfitAlt / accessory は任意
  if (!isRecord(raw.palette)) return fail('invalidPalette')
  const hairColor = asHex(raw.palette.hair)
  const skin = asHex(raw.palette.skin)
  const outfitColor = asHex(raw.palette.outfit)
  const outfitDark = asHex(raw.palette.outfitDark)
  if (!hairColor || !skin || !outfitColor || !outfitDark) return fail('invalidPalette')

  const outfitAlt = asHex(raw.palette.outfitAlt) ?? deriveOutfitColors(outfitColor).outfitAlt
  const accessoryColor = asHex(raw.palette.accessory)
  const palette: AvatarPalette = {
    hair: hairColor,
    skin,
    outfit: outfitColor,
    outfitDark,
    ...(outfitAlt ? { outfitAlt } : {}),
    ...(accessoryColor ? { accessory: accessoryColor } : {}),
  }

  return { ok: true, config: { kind: 'parts', hair, face, accessory, outfit, palette } }
}

// pixels 経路 — 16x16 フリーピクセル + 自動充填正規化
const parsePixelsConfig = (raw: JsonObject): AvatarImportResult => {
  // size 検証 — 固定値 16
  const size = typeof raw.size === 'number' ? raw.size : undefined
  if (size !== 16) return fail('pixelsInvalidSize')

  // rows 検証 — 16 個の文字列配列・各 16 文字
  const rowsRaw = asArray(raw.rows)
  if (!rowsRaw || rowsRaw.length !== 16) return fail('pixelsInvalidRows')

  const rows: string[] = []
  for (const row of rowsRaw) {
    const rowStr = asString(row)
    if (!rowStr || rowStr.length !== 16) return fail('pixelsInvalidRows')
    rows.push(rowStr)
  }

  // palette 検証 — Record<string, HEX> 形式
  if (!isRecord(raw.palette)) return fail('pixelsInvalidPalette')
  const palette: Record<string, string> = {}
  for (const [key, colorVal] of Object.entries(raw.palette)) {
    const hex = asHex(colorVal)
    // HEX 不正なキーは無視(致命的でない)。有効なキーのみ反映
    if (hex) {
      palette[key] = hex
    }
  }

  // マスク充填正規化 — 顔・体の透明率過半なら基準色で自動充填
  const normalizedRows = normalizeFreePixelRows(rows, palette)

  return { ok: true, config: { kind: 'pixels', size: 16, palette, rows: normalizedRows } }
}
