import { describe, expect, it } from 'vitest'
import { SEAT_DIRECTION, seatDirectionLabel } from './seat-direction'

// 画面座標系(y 下向き)なので、回転 0 が下=南・90 が右=東・180 が上=北・270 が左=西
describe('SEAT_DIRECTION と seatDirectionLabel', () => {
  it.each([
    { rotation: 0, direction: 'south', label: '南向き' },
    { rotation: 90, direction: 'east', label: '東向き' },
    { rotation: 180, direction: 'north', label: '北向き' },
    { rotation: 270, direction: 'west', label: '西向き' },
  ] as const)(
    '回転 $rotation は $direction で、aria-label は「$label」',
    ({ rotation, direction, label }) => {
      expect(SEAT_DIRECTION[rotation]).toBe(direction)
      expect(seatDirectionLabel(rotation)).toBe(label)
    }
  )

  it('4 つの回転はすべて別の方角になる', () => {
    expect(new Set(Object.values(SEAT_DIRECTION)).size).toBe(4)
  })
})
