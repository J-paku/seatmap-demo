// アクセサリーパーツ — face / skin の上に重ねる
import type { AccessoryId, PixelMatrix } from '@/types'

const _: null = null

export const ACCESSORY_MATRICES: Record<AccessoryId, PixelMatrix> = {
  none: [
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
  ],
  glasses: [
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, 'accessory', 'accessory', _, 'accessory', 'accessory', _],
    [_, _, _, _, 'accessory', _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
  ],
  cap: [
    [_, _, 'accessory', 'accessory', 'accessory', 'accessory', _, _],
    [_, 'accessory', 'accessory', 'accessory', 'accessory', 'accessory', 'accessory', _],
    ['accessory', 'accessory', _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
  ],
  mask: [
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, 'accessory', 'accessory', 'accessory', 'accessory', _, _],
    [_, 'accessory', 'accessory', 'accessory', 'accessory', 'accessory', 'accessory', _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
  ],
  sunglasses: [
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, 'accessory', 'accessory', _, 'accessory', 'accessory', _],
    [_, _, 'accessory', 'accessory', _, 'accessory', 'accessory', _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
  ],
  // 太いセルフレーム (黒ぶち) — 上辺をワイドに通し、左右に太い柱を立てる
  glassesThick: [
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, 'accessory', 'accessory', 'accessory', 'accessory', 'accessory', 'accessory', _],
    [_, 'accessory', _, 'accessory', 'accessory', _, 'accessory', _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
  ],
  // ティアドロップ (とんぼ型) — 上辺は狭く、下辺を広げて雫状に垂らす
  glassesAviator: [
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, 'accessory', 'accessory', _, _, 'accessory', 'accessory', _],
    [_, 'accessory', 'accessory', 'accessory', 'accessory', 'accessory', 'accessory', _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
  ],
  // 丸メガネ (ラウンド) — コンパクトな左右レンズを下辺のブリッジでつなぐ
  glassesRound: [
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, 'accessory', 'accessory', _, 'accessory', 'accessory', _],
    [_, _, 'accessory', 'accessory', 'accessory', 'accessory', 'accessory', _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
  ],
  // ヒドル専用フロントパーツ — ピンクの帽子前面と中央の白モチーフ余白を再現する
  bow: [
    [_, _, 'accessory', 'accessory', 'accessory', 'accessory', _, _],
    [_, _, 'accessory', 'accessory', 'accessory', 'accessory', _, _],
    [_, _, 'accessory', _, _, 'accessory', _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _],
  ],
}
