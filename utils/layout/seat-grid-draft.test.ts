import { describe, it, expect } from 'vitest'
import {
  addCol,
  addRow,
  buildSeatGridDraft,
  clearSeat,
  createInitialGrid,
  findFirstEmptyCell,
  isColEmpty,
  isRowEmpty,
  moveSeat,
  placeSeat,
  removeCol,
  removeRow,
  serializeSeatGrid,
} from './seat-grid-draft'
import type { SeatGridDraft } from './seat-grid-draft'
import type { Seat } from '@/types'

// COL_PITCH = DEFAULT_SEAT_WIDTH(105) + RELAYOUT_COL_GAP(18) = 123
// ROW_PITCH = DEFAULT_SEAT_HEIGHT(75) + RELAYOUT_ROW_GAP(20) = 95
const COL_PITCH = 123
const ROW_PITCH = 95

const seat = (id: string, x: number, y: number): Seat => ({
  id,
  teamId: 'team-01',
  x,
  y,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId: null,
})

describe('buildSeatGridDraft', () => {
  it('席0件ならnullを返す', () => {
    expect(buildSeatGridDraft([])).toBeNull()
  })

  it('席1件なら1×1グリッドを起こし、originは席の座標になる', () => {
    const draft = buildSeatGridDraft([seat('a', 50, 60)])
    expect(draft).toEqual({
      cells: [['a']],
      originX: 50,
      originY: 60,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    })
  })

  it('ピッチに揃った複数席を正しい行列へ配置する', () => {
    const seats = [
      seat('a', 0, 0),
      seat('b', COL_PITCH, 0),
      seat('c', 0, ROW_PITCH),
      seat('d', COL_PITCH, ROW_PITCH),
    ]
    const draft = buildSeatGridDraft(seats)
    expect(draft?.cells).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
    expect(draft?.originX).toBe(0)
    expect(draft?.originY).toBe(0)
  })

  it('同じセルに丸まる2席は、読み順で後から来た方を最近接の空セルへ押し出す', () => {
    // a: (0,0) → row0,col0 / b: (5,5) → round((5)/95)=0, round(5/123)=0 も同じセル(0,0)
    // ソート順は y昇順→x昇順→id: a(y0)が先、bが後
    const seats = [seat('a', 0, 0), seat('b', 5, 5)]
    const draft = buildSeatGridDraft(seats)
    // rows/colsは1×1(rawCellsの最大row/col+1)なので、衝突解決は列を1本足して解消する
    expect(draft?.cells).toEqual([['a', 'b']])
    expect(draft?.originX).toBe(0)
    expect(draft?.originY).toBe(0)
  })

  it('originXYは全席中の最小座標になる(負の相対位置も許容)', () => {
    const seats = [seat('a', 100, 200), seat('b', 100 + COL_PITCH, 200)]
    const draft = buildSeatGridDraft(seats)
    expect(draft?.originX).toBe(100)
    expect(draft?.originY).toBe(200)
    expect(draft?.cells).toEqual([['a', 'b']])
  })
})

describe('createInitialGrid', () => {
  it('1×1のnullグリッドを、指定originで返す', () => {
    const draft = createInitialGrid(10, 20)
    expect(draft).toEqual({
      cells: [[null]],
      originX: 10,
      originY: 20,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    })
  })
})

describe('addRow / addCol', () => {
  const base: SeatGridDraft = {
    cells: [['a', 'b']],
    originX: 0,
    originY: 0,
    colPitch: COL_PITCH,
    rowPitch: ROW_PITCH,
  }

  it('top挿入は先頭に空行を足し、originYをrowPitch分だけ引く', () => {
    const result = addRow(base, 'top')
    expect(result.cells).toEqual([[null, null], ['a', 'b']])
    expect(result.originY).toBe(-ROW_PITCH)
    expect(result.originX).toBe(0)
  })

  it('bottom挿入は末尾に空行を足し、originは変わらない', () => {
    const result = addRow(base, 'bottom')
    expect(result.cells).toEqual([['a', 'b'], [null, null]])
    expect(result.originY).toBe(0)
  })

  it('left挿入は各行の先頭にnullを足し、originXをcolPitch分だけ引く', () => {
    const result = addCol(base, 'left')
    expect(result.cells).toEqual([[null, 'a', 'b']])
    expect(result.originX).toBe(-COL_PITCH)
  })

  it('right挿入は各行の末尾にnullを足し、originは変わらない', () => {
    const result = addCol(base, 'right')
    expect(result.cells).toEqual([['a', 'b', null]])
    expect(result.originX).toBe(0)
  })

  it('cellsが空配列の状態でaddRowしても列数1のフォールバックで壊れない', () => {
    const empty: SeatGridDraft = { cells: [], originX: 0, originY: 0, colPitch: COL_PITCH, rowPitch: ROW_PITCH }
    const result = addRow(empty, 'bottom')
    expect(result.cells).toEqual([[null]])
  })
})

describe('isRowEmpty / isColEmpty', () => {
  const draft: SeatGridDraft = {
    cells: [
      ['a', null],
      [null, null],
    ],
    originX: 0,
    originY: 0,
    colPitch: COL_PITCH,
    rowPitch: ROW_PITCH,
  }

  it('席があれば非空、全セルnullなら空と判定する', () => {
    expect(isRowEmpty(draft, 0)).toBe(false)
    expect(isRowEmpty(draft, 1)).toBe(true)
  })

  it('範囲外の行はfalseを返す', () => {
    expect(isRowEmpty(draft, -1)).toBe(false)
    expect(isRowEmpty(draft, 2)).toBe(false)
  })

  it('列の空判定も同様', () => {
    expect(isColEmpty(draft, 0)).toBe(false)
    expect(isColEmpty(draft, 1)).toBe(true)
  })

  it('範囲外の列はfalseを返す', () => {
    expect(isColEmpty(draft, -1)).toBe(false)
    expect(isColEmpty(draft, 2)).toBe(false)
  })

  it('cellsが空配列ならisColEmptyはfalseを返す', () => {
    const empty: SeatGridDraft = { cells: [], originX: 0, originY: 0, colPitch: COL_PITCH, rowPitch: ROW_PITCH }
    expect(isColEmpty(empty, 0)).toBe(false)
  })
})

describe('removeRow / removeCol', () => {
  it('空でない行を削除しようとすると元のdraftをそのまま返す(同一参照)', () => {
    const draft: SeatGridDraft = {
      cells: [['a']],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    const result = removeRow(draft, 0)
    expect(result).toBe(draft)
  })

  it('先頭の空行を削除するとoriginYがrowPitch分だけ進む', () => {
    const draft: SeatGridDraft = {
      cells: [[null], ['a']],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    const result = removeRow(draft, 0)
    expect(result.cells).toEqual([['a']])
    expect(result.originY).toBe(ROW_PITCH)
  })

  it('中間の空行を削除してもoriginYは変わらない', () => {
    const draft: SeatGridDraft = {
      cells: [['a'], [null], ['b']],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    const result = removeRow(draft, 1)
    expect(result.cells).toEqual([['a'], ['b']])
    expect(result.originY).toBe(0)
  })

  it('先頭の空列を削除するとoriginXがcolPitch分だけ進む', () => {
    const draft: SeatGridDraft = {
      cells: [[null, 'a']],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    const result = removeCol(draft, 0)
    expect(result.cells).toEqual([['a']])
    expect(result.originX).toBe(COL_PITCH)
  })

  it('空でない列を削除しようとすると元のdraftをそのまま返す', () => {
    const draft: SeatGridDraft = {
      cells: [['a', null]],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    const result = removeCol(draft, 0)
    expect(result).toBe(draft)
  })
})

describe('placeSeat / clearSeat', () => {
  const draft: SeatGridDraft = {
    cells: [['a', null]],
    originX: 0,
    originY: 0,
    colPitch: COL_PITCH,
    rowPitch: ROW_PITCH,
  }

  it('空セルへ席を置ける', () => {
    const result = placeSeat(draft, { row: 0, col: 1 }, 'b')
    expect(result.cells).toEqual([['a', 'b']])
  })

  it('既に席があるセルへは何もしない(元のdraftを返す)', () => {
    const result = placeSeat(draft, { row: 0, col: 0 }, 'b')
    expect(result).toBe(draft)
  })

  it('範囲外セルへは何もしない', () => {
    const result = placeSeat(draft, { row: 5, col: 5 }, 'b')
    expect(result).toBe(draft)
  })

  it('セルを空にできる', () => {
    const result = clearSeat(draft, { row: 0, col: 0 })
    expect(result.cells).toEqual([[null, null]])
  })

  it('範囲外セルのclearは元のdraftを返す', () => {
    const result = clearSeat(draft, { row: 5, col: 5 })
    expect(result).toBe(draft)
  })
})

describe('moveSeat', () => {
  it('空セルへ移動すると移動元が空になる', () => {
    const draft: SeatGridDraft = {
      cells: [['a', null]],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    const result = moveSeat(draft, { row: 0, col: 0 }, { row: 0, col: 1 })
    expect(result.cells).toEqual([[null, 'a']])
  })

  it('席があるセルへ移動すると入れ替わる', () => {
    const draft: SeatGridDraft = {
      cells: [['a', 'b']],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    const result = moveSeat(draft, { row: 0, col: 0 }, { row: 0, col: 1 })
    expect(result.cells).toEqual([['b', 'a']])
  })

  it('移動元が空セルなら何もしない', () => {
    const draft: SeatGridDraft = {
      cells: [[null, 'a']],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    const result = moveSeat(draft, { row: 0, col: 0 }, { row: 0, col: 1 })
    expect(result).toBe(draft)
  })

  it('移動元と移動先が同じセルなら何もしない', () => {
    const draft: SeatGridDraft = {
      cells: [['a']],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    const result = moveSeat(draft, { row: 0, col: 0 }, { row: 0, col: 0 })
    expect(result).toBe(draft)
  })

  it('移動元・移動先のどちらかが範囲外なら何もしない', () => {
    const draft: SeatGridDraft = {
      cells: [['a']],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    expect(moveSeat(draft, { row: 0, col: 0 }, { row: 9, col: 9 })).toBe(draft)
    expect(moveSeat(draft, { row: 9, col: 9 }, { row: 0, col: 0 })).toBe(draft)
  })
})

describe('findFirstEmptyCell', () => {
  it('行優先(上→下・左→右)で最初の空セルを返す', () => {
    const draft: SeatGridDraft = {
      cells: [
        ['a', 'b'],
        [null, 'c'],
      ],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    expect(findFirstEmptyCell(draft)).toEqual({ row: 1, col: 0 })
  })

  it('空セルが無ければnullを返す', () => {
    const draft: SeatGridDraft = {
      cells: [['a', 'b']],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    expect(findFirstEmptyCell(draft)).toBeNull()
  })
})

describe('serializeSeatGrid', () => {
  it('全セルnullなら空配列を返す', () => {
    const draft: SeatGridDraft = {
      cells: [[null, null]],
      originX: 0,
      originY: 0,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    expect(serializeSeatGrid(draft)).toEqual([])
  })

  it('セル位置を均一ピッチの絶対座標へ変換する(内部の空セルはギャップとして残る)', () => {
    const draft: SeatGridDraft = {
      cells: [
        ['a', null, 'b'],
        [null, 'c', null],
      ],
      originX: 10,
      originY: 20,
      colPitch: COL_PITCH,
      rowPitch: ROW_PITCH,
    }
    expect(serializeSeatGrid(draft)).toEqual([
      { seatId: 'a', x: 10, y: 20 },
      { seatId: 'b', x: 10 + 2 * COL_PITCH, y: 20 },
      { seatId: 'c', x: 10 + COL_PITCH, y: 20 + ROW_PITCH },
    ])
  })
})
