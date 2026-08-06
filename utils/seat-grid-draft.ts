import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH, RELAYOUT_COL_GAP } from './seat-relayout'
import type { Seat } from '@/types'

// 07-admin-edit: チームオーバーレイの座席編集グリッド初案(`SeatGridDraft`)を作る純粋関数群
//
// 座席は元々フロア絶対座標しか持たず、`TeamOverlay/utils/seat-grid.ts`の`buildSeatGrid`は
// 座標クラスタリングで行列を毎回推定している。表示専用ならこれで足りるが編集には使えない
// (1席動かすとクラスタ境界が揺れて他席の行列も変わる/空行・空列を表現できない/
// 席0件のチームでは最初の1席の置き場所を計算できない)。
// 編集開始時に座標から確定した行列(`SeatGridDraft`)を1回だけ起こし、以降の全操作は
// その行列の上だけで完結させる。保存時は`serializeSeatGrid`で均一ピッチ座標へ直列化し直す。
//
// 全演算はイミュータブル。ガード違反時は元の`draft`をそのまま返す(呼び出し側にエラー分岐を作らせない)

// `seat-relayout.ts`の`RELAYOUT_ROW_GAP`は同ファイル内専用でexportされていないため、
// このファイルから直接importできない。行ピッチをグリッドリファク結果と揃えるため
// 同じ値をここに複製する。値を変える場合は両ファイルを揃えること
// (`RELAYOUT_ROW_GAP`をexportへ昇格できれば、この複製は不要になる)
const ROW_GAP = 20

const COL_PITCH = DEFAULT_SEAT_WIDTH + RELAYOUT_COL_GAP
const ROW_PITCH = DEFAULT_SEAT_HEIGHT + ROW_GAP

// グリッドセル1件の番地
export type GridCell = { row: number; col: number }

// 編集用グリッド初案。`cells`は`seatId`または空セル(null)の行列
export type SeatGridDraft = {
  cells: (string | null)[][]
  originX: number
  originY: number
  colPitch: number
  rowPitch: number
}

// `serializeSeatGrid`の出力単位。`draft`はセル位置しか持たないため座標だけを返す
export type SeatGridPosition = { seatId: string; x: number; y: number }

const createMatrix = (rows: number, cols: number): (string | null)[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => null))

const cloneMatrix = (cells: (string | null)[][]): (string | null)[][] => cells.map((row) => [...row])

const setCell = (cells: (string | null)[][], row: number, col: number, value: string | null): (string | null)[][] => {
  const next = cloneMatrix(cells)
  next[row][col] = value
  return next
}

// 右端に空列を1本足す(衝突解決時に置き場所が尽きた場合の最終手段)
const appendCol = (cells: (string | null)[][]): (string | null)[][] => cells.map((row) => [...row, null])

const inBounds = (draft: SeatGridDraft, row: number, col: number): boolean =>
  row >= 0 && row < draft.cells.length && col >= 0 && col < (draft.cells[row]?.length ?? 0)

// マンハッタン距離が最小の空セルを探す。同距離なら行優先・列優先で先に見つかった方を採用する
const findNearestEmptyCell = (cells: (string | null)[][], row: number, col: number): GridCell | null => {
  let best: GridCell | null = null
  let bestDist = Infinity
  for (let r = 0; r < cells.length; r += 1) {
    for (let c = 0; c < cells[r].length; c += 1) {
      if (cells[r][c] !== null) continue
      const dist = Math.abs(r - row) + Math.abs(c - col)
      if (dist < bestDist) {
        bestDist = dist
        best = { row: r, col: c }
      }
    }
  }
  return best
}

// 座席の絶対座標からグリッド初案を1回だけ起こす。`originX`/`originY`は最小座標。
// 保存済み座標がピッチに揃っていない場合、複数の席が同じセルへ丸め込まれることがあるため、
// 読み順(上→下・左→右)で後から来た方を最近接の空セルへ押し出す。席0件ならnull
export const buildSeatGridDraft = (seats: Seat[]): SeatGridDraft | null => {
  if (seats.length === 0) return null

  const originX = Math.min(...seats.map((s) => s.x))
  const originY = Math.min(...seats.map((s) => s.y))

  const ordered = [...seats].sort((a, b) =>
    a.y === b.y ? (a.x === b.x ? a.id.localeCompare(b.id) : a.x - b.x) : a.y - b.y
  )
  const rawCells = ordered.map((seat) => ({
    seatId: seat.id,
    row: Math.round((seat.y - originY) / ROW_PITCH),
    col: Math.round((seat.x - originX) / COL_PITCH),
  }))

  const rows = Math.max(...rawCells.map((c) => c.row)) + 1
  const cols = Math.max(...rawCells.map((c) => c.col)) + 1

  let cells = createMatrix(rows, cols)
  for (const cell of rawCells) {
    if (cells[cell.row][cell.col] === null) {
      cells = setCell(cells, cell.row, cell.col, cell.seatId)
      continue
    }
    let target = findNearestEmptyCell(cells, cell.row, cell.col)
    while (target === null) {
      cells = appendCol(cells)
      target = findNearestEmptyCell(cells, cell.row, cell.col)
    }
    cells = setCell(cells, target.row, target.col, cell.seatId)
  }

  return { cells, originX, originY, colPitch: COL_PITCH, rowPitch: ROW_PITCH }
}

// 席0件のチーム用に1×1の初期グリッドを作る
export const createInitialGrid = (originX: number, originY: number): SeatGridDraft => ({
  cells: createMatrix(1, 1),
  originX,
  originY,
  colPitch: COL_PITCH,
  rowPitch: ROW_PITCH,
})

// 行を追加する。`top`挿入は既存席の絶対座標を保つためoriginをずらし、`bottom`はorigin不変
export const addRow = (draft: SeatGridDraft, edge: 'top' | 'bottom'): SeatGridDraft => {
  const cols = draft.cells[0]?.length ?? 1
  const newRow: (string | null)[] = Array.from({ length: cols }, () => null)
  if (edge === 'top') {
    return { ...draft, cells: [newRow, ...draft.cells], originY: draft.originY - draft.rowPitch }
  }
  return { ...draft, cells: [...draft.cells, newRow] }
}

// 列を追加する。`left`挿入は既存席の絶対座標を保つためoriginをずらし、`right`はorigin不変
export const addCol = (draft: SeatGridDraft, edge: 'left' | 'right'): SeatGridDraft => {
  if (edge === 'left') {
    return { ...draft, cells: draft.cells.map((row) => [null, ...row]), originX: draft.originX - draft.colPitch }
  }
  return { ...draft, cells: draft.cells.map((row) => [...row, null]) }
}

// 指定行が完全に空か。範囲外はfalse
export const isRowEmpty = (draft: SeatGridDraft, row: number): boolean => {
  if (row < 0 || row >= draft.cells.length) return false
  return draft.cells[row].every((cell) => cell === null)
}

// 指定列が完全に空か。範囲外はfalse
export const isColEmpty = (draft: SeatGridDraft, col: number): boolean => {
  if (draft.cells.length === 0 || col < 0 || col >= draft.cells[0].length) return false
  return draft.cells.every((row) => row[col] === null)
}

// 完全に空の行だけ削除する。空でなければ元の`draft`をそのまま返す。
// 先頭行の削除はoriginをずらして残りの席の絶対座標を保ち、中間行の削除は後続行が詰まる
export const removeRow = (draft: SeatGridDraft, row: number): SeatGridDraft => {
  if (!isRowEmpty(draft, row)) return draft
  const cells = draft.cells.filter((_, r) => r !== row)
  const originY = row === 0 ? draft.originY + draft.rowPitch : draft.originY
  return { ...draft, cells, originY }
}

// 完全に空の列だけ削除する。空でなければ元の`draft`をそのまま返す。
// 先頭列の削除はoriginをずらして残りの席の絶対座標を保ち、中間列の削除は後続列が詰まる
export const removeCol = (draft: SeatGridDraft, col: number): SeatGridDraft => {
  if (!isColEmpty(draft, col)) return draft
  const cells = draft.cells.map((row) => row.filter((_, c) => c !== col))
  const originX = col === 0 ? draft.originX + draft.colPitch : draft.originX
  return { ...draft, cells, originX }
}

// 指定セルへ席を配置する。範囲外、または既に席があるセルへは何もしない(元の`draft`を返す)
export const placeSeat = (draft: SeatGridDraft, cell: GridCell, seatId: string): SeatGridDraft => {
  if (!inBounds(draft, cell.row, cell.col)) return draft
  if (draft.cells[cell.row][cell.col] !== null) return draft
  return { ...draft, cells: setCell(draft.cells, cell.row, cell.col, seatId) }
}

// 指定セルを空にするだけ。行・列自体は縮めない(消したら勝手に詰まる、を作らない)
export const clearSeat = (draft: SeatGridDraft, cell: GridCell): SeatGridDraft => {
  if (!inBounds(draft, cell.row, cell.col)) return draft
  return { ...draft, cells: setCell(draft.cells, cell.row, cell.col, null) }
}

// 席を移動する。移動元が範囲外・空なら何もしない。移動先に席があれば入替、無ければ移動するだけ
export const moveSeat = (draft: SeatGridDraft, from: GridCell, to: GridCell): SeatGridDraft => {
  if (!inBounds(draft, from.row, from.col) || !inBounds(draft, to.row, to.col)) return draft
  if (from.row === to.row && from.col === to.col) return draft
  const seatId = draft.cells[from.row][from.col]
  if (seatId === null) return draft
  const destSeatId = draft.cells[to.row][to.col]
  const cells = setCell(setCell(draft.cells, from.row, from.col, destSeatId), to.row, to.col, seatId)
  return { ...draft, cells }
}

// `seatId`が今どのセルにあるかを探す。無ければnull
export const findSeatCell = (draft: SeatGridDraft, seatId: string): GridCell | null => {
  for (let r = 0; r < draft.cells.length; r += 1) {
    const c = draft.cells[r].indexOf(seatId)
    if (c !== -1) return { row: r, col: c }
  }
  return null
}

// 行優先(上→下・左→右)で最初に見つかった空セル。無ければnull
export const findFirstEmptyCell = (draft: SeatGridDraft): GridCell | null => {
  for (let r = 0; r < draft.cells.length; r += 1) {
    const c = draft.cells[r].indexOf(null)
    if (c !== -1) return { row: r, col: c }
  }
  return null
}

// 全席を均一ピッチの絶対座標へ直列化する。空セルは出力に含めない
// (先頭・末尾の空行/空列は自然に消え、内部の空行/空列はギャップとして座標に残る)
export const serializeSeatGrid = (draft: SeatGridDraft): SeatGridPosition[] => {
  const positions: SeatGridPosition[] = []
  for (let r = 0; r < draft.cells.length; r += 1) {
    for (let c = 0; c < draft.cells[r].length; c += 1) {
      const seatId = draft.cells[r][c]
      if (seatId === null) continue
      positions.push({ seatId, x: draft.originX + c * draft.colPitch, y: draft.originY + r * draft.rowPitch })
    }
  }
  return positions
}
