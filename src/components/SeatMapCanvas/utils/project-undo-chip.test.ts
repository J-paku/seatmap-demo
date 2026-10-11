import { describe, it, expect } from 'vitest'
import { DISMISS_MS, isSameView, project } from './project-undo-chip'
import type { UndoChipRequest, UndoChipView } from '../type'
import type { Transform } from '@/utils/layout/geometry'

const T: Transform = { scale: 2, translateX: 30, translateY: 40 }

const requestOf = (frame: UndoChipRequest['frame']): UndoChipRequest => ({
  anchor: { x: 5, y: 7 },
  message: '削除しました',
  frame,
  recent: null,
})

const viewOf = (frame: UndoChipView['frame']): UndoChipView => ({ chip: { x: 1, y: 2 }, frame })

describe('DISMISS_MS', () => {
  it('チップは4秒で消える', () => {
    expect(DISMISS_MS).toBe(4000)
  })
})

describe('project', () => {
  it('アンカーを変換で投影し、倍率に依らない隙間 10px を下に足す', () => {
    expect(project(requestOf(null), T).chip).toEqual({ x: 5 * 2 + 30, y: 7 * 2 + 40 + 10 })
  })

  it('隙間は倍率を変えても 10px のまま', () => {
    const big = project(requestOf(null), { ...T, scale: 4 })
    expect(big.chip.y - (7 * 4 + 40)).toBe(10)
  })

  it('残像フレームは位置と大きさを変換で投影する(隙間は足さない)', () => {
    const view = project(requestOf({ x: 3, y: 4, w: 6, h: 8 }), T)
    expect(view.frame).toEqual({ x: 3 * 2 + 30, y: 4 * 2 + 40, w: 12, h: 16 })
  })

  it('残像フレームが無ければ null', () => {
    expect(project(requestOf(null), T).frame).toBeNull()
  })
})

describe('isSameView', () => {
  const frame = { x: 1, y: 2, w: 3, h: 4 }

  it('前回が無ければ違う', () => {
    expect(isSameView(null, viewOf(null))).toBe(false)
  })

  it('フレーム無しで位置が同じなら同じ', () => {
    expect(isSameView(viewOf(null), viewOf(null))).toBe(true)
  })

  it('フレーム有りで全値が同じなら別オブジェクトでも同じ', () => {
    expect(isSameView(viewOf({ ...frame }), viewOf({ ...frame }))).toBe(true)
  })

  it.each([
    ['chip.x', { chip: { x: 9, y: 2 } }],
    ['chip.y', { chip: { x: 1, y: 9 } }],
  ])('%s だけ違えば違う', (_name, diff) => {
    expect(isSameView(viewOf({ ...frame }), { ...viewOf({ ...frame }), ...diff })).toBe(false)
  })

  it.each(['x', 'y', 'w', 'h'] as const)('frame.%s だけ違えば違う', key => {
    expect(isSameView(viewOf({ ...frame }), viewOf({ ...frame, [key]: 9 }))).toBe(false)
  })

  it('片方だけにフレームがあれば違う', () => {
    expect(isSameView(viewOf(null), viewOf({ ...frame }))).toBe(false)
    expect(isSameView(viewOf({ ...frame }), viewOf(null))).toBe(false)
  })
})
