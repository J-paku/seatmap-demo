import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLOSE_DELAY_MS, measure } from './place-attendee-popover'

// node 環境に DOMRect のコンストラクタは無いので、型を満たすプレーンオブジェクトで渡す
const makeRect = (top: number, bottom: number, right: number): DOMRect => ({
  x: right - 40,
  y: top,
  width: 40,
  height: bottom - top,
  left: right - 40,
  top,
  right,
  bottom,
  toJSON: () => ({}),
})

// 画面は幅 1000・高さ 800。下の空き = 800 - (下端 + 隙間 4) - 端の余白 16 = 780 - 下端
beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1000, innerHeight: 800 })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CLOSE_DELAY_MS', () => {
  it('ボタンから離れて 150ms 待ってから閉じる', () => {
    expect(CLOSE_DELAY_MS).toBe(150)
  })
})

describe('measure', () => {
  it('下に十分な空きがあれば、アンカーの下端から隙間を空けて下へ開き、右端をそろえる', () => {
    // 下の空き = 780 - 130 = 650、右 = 1000 - 900 = 100
    expect(measure('m1', makeRect(100, 130, 900), false)).toEqual({
      meetingId: 'm1',
      top: 134,
      right: 100,
      flipped: false,
      availableHeight: 650,
      maxWidthPx: 320,
      isSticky: false,
    })
  })

  it('下の空きがちょうど 200 なら反転せず、空きをそのまま高さの上限にする', () => {
    // 下の空き = 780 - 580 = 200
    expect(measure('m2', makeRect(550, 580, 900), true)).toEqual({
      meetingId: 'm2',
      top: 584,
      right: 100,
      flipped: false,
      availableHeight: 200,
      maxWidthPx: 320,
      isSticky: true,
    })
  })

  it('下の空きが 199 なら上向きへ反転し、アンカーの上端から隙間ぶん上を基準にする', () => {
    // 下の空き = 780 - 581 = 199。上の高さ = 上端 551 - 20 = 531
    expect(measure('m3', makeRect(551, 581, 900), false)).toEqual({
      meetingId: 'm3',
      top: 547,
      right: 100,
      flipped: true,
      availableHeight: 531,
      maxWidthPx: 320,
      isSticky: false,
    })
  })

  it('反転しても上の空きが 120 に満たなければ、高さの上限は 120 を下回らない', () => {
    // 下の空き = 780 - 700 = 80 で反転。上の高さ = 100 - 20 = 80
    const state = measure('m4', makeRect(100, 700, 900), false)
    expect(state.flipped).toBe(true)
    expect(state.top).toBe(96)
    expect(state.availableHeight).toBe(120)
  })

  it('アンカーが画面右端に寄っても、右の余白は 8 を下回らない', () => {
    // 1000 - 995 = 5
    expect(measure('m5', makeRect(100, 130, 995), false).right).toBe(8)
  })

  it('画面幅が 640 ちょうどなら狭い画面とみなさず、幅の上限は 320', () => {
    vi.stubGlobal('window', { innerWidth: 640, innerHeight: 800 })
    expect(measure('m6', makeRect(100, 130, 300), false).maxWidthPx).toBe(320)
  })

  it.each([
    { name: '左に寄ったアンカーでも 180 を下回らない', right: 100, maxWidthPx: 180 },
    { name: 'アンカーの右端 - 8 まで広げる', right: 300, maxWidthPx: 292 },
    { name: '広げても 320 を超えない', right: 600, maxWidthPx: 320 },
  ])('画面幅が 639 の狭い画面では、$name', ({ right, maxWidthPx }) => {
    vi.stubGlobal('window', { innerWidth: 639, innerHeight: 800 })
    expect(measure('m7', makeRect(100, 130, right), false).maxWidthPx).toBe(maxWidthPx)
  })
})
