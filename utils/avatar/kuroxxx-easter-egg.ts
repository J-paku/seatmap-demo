// 隠しキャラ降臨イースターエッグ専用 — 16x16 ドット絵と rect 生成。通常の 8x8 パーツ経路とは完全に分離する
// 隠しコマンド成立で hair をこの隠しキャラへ切り替え → usePixelAvatar がこの 16x16 を描画する
// 著作権配慮でファイル名・識別子はキャラ名を伏せる (コードネーム kuroxxx)。色・ドットは固定 (palette 非依存)

export const KUROXXX_GRID_SIZE = 16

interface KuroxxxRect {
  x: number
  y: number
  w: number
  color: string
}

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

// 横方向の同色連続を 1 rect にまとめて返す (透明セルで区切る)
export const buildKuroxxxRects = (): KuroxxxRect[] => {
  const rects: KuroxxxRect[] = []
  KUROXXX_ROWS.forEach((row, y) => {
    let start = -1
    let prevColor: string | null = null
    const flush = (endX: number): void => {
      if (start >= 0 && prevColor) {
        rects.push({ x: start, y, w: endX - start, color: prevColor })
      }
      start = -1
      prevColor = null
    }
    for (let x = 0; x < KUROXXX_GRID_SIZE; x++) {
      const color = KUROXXX_LEGEND[row[x] ?? '.'] ?? null
      if (color === prevColor && start >= 0) {
        continue
      }
      flush(x)
      if (color) {
        start = x
        prevColor = color
      }
    }
    flush(KUROXXX_GRID_SIZE)
  })
  return rects
}
