import { describe, expect, it } from 'vitest'
import { buildSeatGrid, gridCellKey } from './seat-grid'
import type { Seat } from '@/types'

// 幅 100・高さ 80 の席なら、同じ列とみなす幅は 100 * 0.6 = 60、同じ行とみなす高さは 80 * 0.6 = 48
const seat = (id: string, x: number, y: number, width = 100, height = 80): Seat => ({
  id,
  teamId: 'team-01',
  x,
  y,
  width,
  height,
  rotation: 0,
  employeeId: null,
})

type Cell = [row: number, col: number, seatId: string]

// 行・列・席 id だけを並び順のまま取り出す
const cellsOf = (seats: Seat[]): Cell[] =>
  buildSeatGrid(seats).positionedSeats.map((p): Cell => [p.row, p.col, p.seat.id])

describe('gridCellKey', () => {
  it('行と列を「行:列」の文字列にする', () => {
    expect(gridCellKey(3, 7)).toBe('3:7')
  })
})

describe('buildSeatGrid', () => {
  it('席が無ければ 0 行 0 列の空のグリッドを返す', () => {
    expect(buildSeatGrid([])).toEqual({
      positionedSeats: [],
      seatByGridCell: new Map(),
      rows: 0,
      cols: 0,
    })
  })

  it('2 行 3 列に並んだ席を、渡した順に関係なく行→列の順に並べる', () => {
    // 列の間隔 110・行の間隔 90 で、どれも同じ列・同じ行とみなす幅を超えている
    const seats = [
      seat('b3', 420, 190),
      seat('a2', 310, 100),
      seat('b1', 200, 190),
      seat('a3', 420, 100),
      seat('b2', 310, 190),
      seat('a1', 200, 100),
    ]
    const grid = buildSeatGrid(seats)
    expect(grid.rows).toBe(2)
    expect(grid.cols).toBe(3)
    expect(cellsOf(seats)).toEqual([
      [0, 0, 'a1'],
      [0, 1, 'a2'],
      [0, 2, 'a3'],
      [1, 0, 'b1'],
      [1, 1, 'b2'],
      [1, 2, 'b3'],
    ])
  })

  it('行列の番地から席を引ける', () => {
    const grid = buildSeatGrid([seat('a1', 200, 100), seat('a2', 310, 100), seat('b1', 200, 190)])
    expect(grid.seatByGridCell.get(gridCellKey(0, 0))?.id).toBe('a1')
    expect(grid.seatByGridCell.get(gridCellKey(0, 1))?.id).toBe('a2')
    expect(grid.seatByGridCell.get(gridCellKey(1, 0))?.id).toBe('b1')
    expect(grid.seatByGridCell.get(gridCellKey(1, 1))).toBeUndefined()
    expect(grid.seatByGridCell.size).toBe(3)
  })

  it('編集で少しずれた席も同じ行・同じ列にまとめる', () => {
    const seats = [
      seat('a1', 200, 100),
      seat('a2', 314, 96),
      seat('b1', 205, 194),
      seat('b2', 306, 190),
    ]
    const grid = buildSeatGrid(seats)
    expect(grid.rows).toBe(2)
    expect(grid.cols).toBe(2)
    expect(cellsOf(seats)).toEqual([
      [0, 0, 'a1'],
      [0, 1, 'a2'],
      [1, 0, 'b1'],
      [1, 1, 'b2'],
    ])
  })

  it('ずれが席の幅・高さの 6 割ちょうどまでは同じ列・行、超えたら別の列・行にする', () => {
    expect(buildSeatGrid([seat('a', 200, 100), seat('b', 260, 148)])).toMatchObject({
      rows: 1,
      cols: 1,
    })
    expect(buildSeatGrid([seat('a', 200, 100), seat('b', 261, 149)])).toMatchObject({
      rows: 2,
      cols: 2,
    })
  })

  it('同じ列とみなす幅は席の幅の平均から決める', () => {
    // 幅 60 と 140 の平均 100 なので 60 までは同じ列。幅 60 の席だけで決めると 36 で別の列になる
    const seats = [seat('a', 200, 100, 60, 80), seat('b', 250, 100, 140, 80)]
    expect(buildSeatGrid(seats).cols).toBe(1)
  })

  it('同じ行とみなす高さは席の高さの平均から決める', () => {
    // 高さ 40 と 120 の平均 80 なので 48 までは同じ行。高さ 40 の席だけで決めると 24 で別の行になる
    const seats = [seat('a', 200, 100, 100, 40), seat('b', 200, 140, 100, 120)]
    expect(buildSeatGrid(seats).rows).toBe(1)
  })

  it('2 つの列からちょうど等距離の席は、番号の小さい列に置く', () => {
    // 列の起点は 200 と 300。250 は 200 と同じ列のまとまりに入り、どちらにも 50 離れている
    const seats = [seat('left', 200, 100), seat('mid', 250, 100), seat('right', 300, 100)]
    expect(cellsOf(seats)).toEqual([
      [0, 0, 'left'],
      [0, 0, 'mid'],
      [0, 1, 'right'],
    ])
  })

  it('まとまりの起点より次の列の起点に近い席は、近い方の列に置く', () => {
    // 255 は 200 と同じまとまりに入るが、200 から 55・300 から 45 なので右の列に寄せる
    const seats = [seat('left', 200, 100), seat('near-right', 255, 100), seat('right', 300, 100)]
    expect(cellsOf(seats)).toEqual([
      [0, 0, 'left'],
      [0, 1, 'near-right'],
      [0, 1, 'right'],
    ])
  })
})
