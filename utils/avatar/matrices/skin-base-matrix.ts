// アバターの素肌レイヤー — 全キャラ共通の顔と首
import type { PixelMatrix } from '@/types'

const _: null = null

export const SKIN_BASE_MATRIX: PixelMatrix = [
  [_, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _],
  [_, _, 'skin', 'skin', 'skin', 'skin', _, _],
  [_, _, 'skin', 'skin', 'skin', 'skin', _, _],
  [_, _, 'skin', 'skin', 'skin', 'skin', _, _],
  [_, 'skin', 'skin', 'skin', 'skin', 'skin', 'skin', _],
  [_, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _],
]
