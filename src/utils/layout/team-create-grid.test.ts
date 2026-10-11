import { describe, it, expect } from 'vitest'
import { NEW_TEAM_AREA_SIZE, newTeamSeatBoxes } from './team-create-grid'

describe('NEW_TEAM_AREA_SIZE', () => {
  it('4列×90 + 3ギャップ×18 + パディング20×2 = 454、2行×65 + 1ギャップ×20 + パディング20×2 = 190', () => {
    expect(NEW_TEAM_AREA_SIZE).toEqual({ width: 454, height: 190 })
  })
})

describe('newTeamSeatBoxes', () => {
  it('原点(0,0)基準で2行4列=8席を行優先で返す', () => {
    const boxes = newTeamSeatBoxes({ x: 0, y: 0 })
    expect(boxes).toHaveLength(8)
    // 1行目
    expect(boxes[0]).toEqual({ x: 20, y: 20, w: 90, h: 65 })
    expect(boxes[1]).toEqual({ x: 20 + 108, y: 20, w: 90, h: 65 })
    expect(boxes[2]).toEqual({ x: 20 + 216, y: 20, w: 90, h: 65 })
    expect(boxes[3]).toEqual({ x: 20 + 324, y: 20, w: 90, h: 65 })
    // 2行目 (row=1 → y = 20 + 65 + 20 = 105)
    expect(boxes[4]).toEqual({ x: 20, y: 105, w: 90, h: 65 })
    expect(boxes[7]).toEqual({ x: 20 + 324, y: 105, w: 90, h: 65 })
  })

  it('areaのオフセット分だけ全席が平行移動する', () => {
    const boxes = newTeamSeatBoxes({ x: 1000, y: 500 })
    expect(boxes[0]).toEqual({ x: 1020, y: 520, w: 90, h: 65 })
    expect(boxes[7]).toEqual({ x: 1000 + 20 + 324, y: 500 + 105, w: 90, h: 65 })
  })

  it('全席の寸法は90×65で固定', () => {
    const boxes = newTeamSeatBoxes({ x: 0, y: 0 })
    for (const box of boxes) {
      expect(box.w).toBe(90)
      expect(box.h).toBe(65)
    }
  })
})
