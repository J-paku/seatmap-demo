// 16x16 フリーピクセルアバター — マスク座標定義と充填正規化ロジック
// AI 自由生成の比率厳守(顔:体=6:4)と空マスク強制充填の中核

// 16x16 グリッド上のマスク領域定義 — 8x8→16x16(×2 スケール) 比率保持
// 顔マスク: row4-9(6行) col4-11(8列)
// 体マスク: row12-15(4行) col0-15(全幅16列)
// 比率 顔6行:体4行 = 元 3:2 不変

const AVATAR_MASK_COORDS = {
  // 顔領域: 左上 (row4, col4) から 右下 (row9, col11)
  face: {
    rowStart: 4,
    rowEnd: 9, // 含む
    colStart: 4,
    colEnd: 11, // 含む
    // 計算値: 6行 × 8列
    rows: 6,
    cols: 8,
  },
  // 体領域: 左上 (row12, col0) から 右下 (row15, col15)
  outfit: {
    rowStart: 12,
    rowEnd: 15, // 含む
    colStart: 0,
    colEnd: 15, // 含む
    // 計算値: 4行 × 16列
    rows: 4,
    cols: 16,
  },
} as const

// マスク座標の総セル数

// 透明度判定用の集計結果型
interface MaskFillStats {
  totalCells: number
  transparentCells: number
  opaquePercent: number
}

// マスク領域内のセルを配列化して列挙
function getMaskCells(
  mask: (typeof AVATAR_MASK_COORDS)[keyof typeof AVATAR_MASK_COORDS]
): Array<{ row: number; col: number }> {
  const cells: Array<{ row: number; col: number }> = []
  for (let r = mask.rowStart; r <= mask.rowEnd; r++) {
    for (let c = mask.colStart; c <= mask.colEnd; c++) {
      cells.push({ row: r, col: c })
    }
  }
  return cells
}

// マスク領域内の透明度統計を計算 — rows は 16 個・各 16 文字の前提
// palette に無いキー(慣例'.') = 透明セルとカウント
function countMaskTransparency(
  rows: string[],
  mask: (typeof AVATAR_MASK_COORDS)[keyof typeof AVATAR_MASK_COORDS],
  palette: Record<string, string>
): MaskFillStats {
  let totalCells = 0
  let transparentCells = 0

  for (const { row, col } of getMaskCells(mask)) {
    const char = rows[row]?.[col] ?? '.'
    const isTransparent = !palette.hasOwnProperty(char) || char === '.'
    totalCells++
    if (isTransparent) transparentCells++
  }

  return {
    totalCells,
    transparentCells,
    opaquePercent: totalCells > 0 ? ((totalCells - transparentCells) / totalCells) * 100 : 0,
  }
}

// マスク領域を指定キーで強制充填する — rows を新規配列で返す(in-place 改変しない)
function fillMaskWithKey(
  rows: string[],
  mask: (typeof AVATAR_MASK_COORDS)[keyof typeof AVATAR_MASK_COORDS],
  fillKey: string
): string[] {
  const filled = rows.map(row => row.split(''))

  for (const { row, col } of getMaskCells(mask)) {
    const char = rows[row]?.[col] ?? '.'
    // 透明セル(palette 未定義 or '.') のみ充填
    const isTransparent = !rows[row]?.charAt(col) || char === '.'
    if (isTransparent) {
      filled[row][col] = fillKey
    }
  }

  return filled.map(row => row.join(''))
}

// AI 出力の rows を正規化 — 顔・体マスク未充填時に基準色で強制充填
// palette キーが無い場合は無視し、常に正規化済み rows を返す(never reject)
export function normalizeFreePixelRows(rows: string[], palette: Record<string, string>): string[] {
  let result = [...rows]

  // 顔マスク: skin 基準色で充填(palette に skin キーがなくても無視)
  const faceStats = countMaskTransparency(result, AVATAR_MASK_COORDS.face, palette)
  if (faceStats.transparentCells > faceStats.totalCells / 2) {
    // 過半が透明 → skin で充填
    const skinKey = Object.keys(palette).find(k => k === 'skin') || 's'
    result = fillMaskWithKey(result, AVATAR_MASK_COORDS.face, skinKey)
  }

  // 体マスク: outfit 基準色で充填(palette に outfit キーがなくても無視)
  const outfitStats = countMaskTransparency(result, AVATAR_MASK_COORDS.outfit, palette)
  if (outfitStats.transparentCells > outfitStats.totalCells / 2) {
    // 過半が透明 → outfit で充填
    const outfitKey = Object.keys(palette).find(k => k === 'outfit') || 'o'
    result = fillMaskWithKey(result, AVATAR_MASK_COORDS.outfit, outfitKey)
  }

  return result
}
