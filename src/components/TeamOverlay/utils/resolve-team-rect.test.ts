import { describe, expect, it } from 'vitest'
import type { MinimapArea } from '@/types'
import { resolveTeamRect } from './resolve-team-rect'

describe('resolveTeamRect', () => {
  it('ミニマップのチーム領域があればそれをそのまま使う', () => {
    const area: MinimapArea = {
      idPrefix: 'A',
      x: 10,
      y: 20,
      w: 300,
      h: 120,
      label: '営業部',
      dotColor: 'red',
    }
    expect(resolveTeamRect(area)).toBe(area)
  })

  it('無ければ原点の空矩形', () => {
    expect(resolveTeamRect(null)).toEqual({ x: 0, y: 0, w: 0, h: 0 })
  })
})
