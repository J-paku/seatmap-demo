// 隠しキャラ降臨イースターエッグ専用 — 16x16 ドット絵と rect 生成。ドット絵は通常の 8x8 パーツ経路とは
// 完全に分離する (rect へのまとめ方だけ build-pixel-rects を共有する)
// 隠しコマンド成立で hair をこの隠しキャラへ切り替え → usePixelAvatar がこの 16x16 を描画する
// 著作権配慮でファイル名・識別子はキャラ名を伏せる (コードネーム kuroxxx)。色・ドットは固定 (palette 非依存)
import { buildRectsFromMatrix, type PixelRect } from './build-pixel-rects'

export const KUROXXX_GRID_SIZE = 16

// 1文字 → HEX 色。'.' は透明 (legend 未定義扱い)
const KUROXXX_LEGEND: Record<string, string> = {
  K: '#26222B', // 黒いジェスターフード / 輪郭 / 胴体
  W: '#FCF7F3', // 白い顔
  P: '#F4B8CE', // ピンクの髑髏モチーフ
  E: '#15121A', // 目・髑髏の眼窩
  M: '#9A5566', // 口
  R: '#F2A9C6', // ほほの差し色
  G: '#FFFFFF', // 瞳のハイライト
}

// 上から 猫耳フード → 額のピンク髑髏(眼窩2) → 白い顔 → 吊り上がった小悪魔目 → ほほ・口 → 胴体 → 脚
const KUROXXX_ROWS: readonly string[] = [
  '..KK........KK..',
  '..KKKK....KKKK..',
  '.KKKKKK..KKKKKK.',
  '.KKKKKKKKKKKKKK.',
  '.KKKKKPPPPKKKKK.',
  '.KKKKPEPPEPKKKK.',
  '.KKKKKPPPPKKKKK.',
  '.KKWWWWWWWWWWKK.',
  '.KWEWWWWWWWWEWK.',
  '.KWEGWWWWWWGEWK.',
  '.KWWEWWWWWWEWWK.',
  '.KWRRWWMMWWRRWK.',
  '.KKWWWWWWWWWWKK.',
  '..KKKKKKKKKKKK..',
  '...KKK....KKK...',
  '...KKK....KKK...',
]

// 横方向の同色連続を 1 rect にまとめて返す (透明セルで区切る)。まとめ方は通常のアバターと同じ
// buildRectsFromMatrix を使う。各セルを legend の色 (無ければ透明の null) に置き換えてから渡す。
// legend は文字ごとに色が異なるので、同じ色の連続 = 同じ文字の連続になる
export const buildKuroxxxRects = (): PixelRect[] =>
  buildRectsFromMatrix(
    KUROXXX_ROWS.map(row => Array.from(row, char => KUROXXX_LEGEND[char] ?? null)),
    KUROXXX_GRID_SIZE,
    color => color
  )
