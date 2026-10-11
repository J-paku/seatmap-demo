// §02-2 新規チームの固定グリッド(2行4列)。ゴーストの寸法と、生成する8席の位置を
// この1ファイルから導く。枠と席を別々に計算すると、片方だけ直したときに席が枠からはみ出す
import type { Rect } from './rect'

// グリッド寸法は利用者に選ばせない(§02-2「rows=2, cols=4固定、グリッド寸法は選択不可」)
const NEW_TEAM_ROWS = 2
const NEW_TEAM_COLS = 4

// 算出式の各項(§02-2)。横 4×90 + 3×18 + 20×2 = 454 / 縦 2×65 + 20 + 20×2 = 190
const SEAT_WIDTH = 90
const SEAT_HEIGHT = 65
const COL_GAP = 18
const ROW_GAP = 20
const PADDING = 20

// チームゴーストの固定サイズ 454×190。リサイズ不可なので、ここが唯一の寸法になる
export const NEW_TEAM_AREA_SIZE = {
  width: NEW_TEAM_COLS * SEAT_WIDTH + (NEW_TEAM_COLS - 1) * COL_GAP + PADDING * 2,
  height: NEW_TEAM_ROWS * SEAT_HEIGHT + (NEW_TEAM_ROWS - 1) * ROW_GAP + PADDING * 2,
}

// エリア左上を基準にした8席の矩形。行優先(左上→右→次の行)で返す
export const newTeamSeatBoxes = (area: { x: number; y: number }): Rect[] => {
  const boxes: Rect[] = []
  for (let row = 0; row < NEW_TEAM_ROWS; row += 1) {
    for (let col = 0; col < NEW_TEAM_COLS; col += 1) {
      boxes.push({
        x: area.x + PADDING + col * (SEAT_WIDTH + COL_GAP),
        y: area.y + PADDING + row * (SEAT_HEIGHT + ROW_GAP),
        w: SEAT_WIDTH,
        h: SEAT_HEIGHT,
      })
    }
  }
  return boxes
}
