import { describe, it, expect } from 'vitest'
import { rectsOfKinds, rectOfRef } from './layout-objects'
import type { Facility, Furniture, Seat, SeatLayout, Team } from '@/types'

const seat = (overrides: Partial<Seat> = {}): Seat => ({
  id: 'team-01-001',
  teamId: 'team-01',
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  rotation: 0,
  employeeId: null,
  ...overrides,
})

const team = (overrides: Partial<Team> = {}): Team => ({
  id: 'team-01',
  idPrefix: 'team-01',
  name: 'チームA',
  color: '#ff0000',
  area: { x: 10, y: 20, w: 300, h: 200 },
  ...overrides,
})

const facility = (overrides: Partial<Facility> = {}): Facility => ({
  id: 'fac-01',
  name: '会議室1',
  kind: 'meeting',
  x: 50,
  y: 60,
  width: 120,
  height: 90,
  ...overrides,
})

const furniture = (overrides: Partial<Furniture> = {}): Furniture => ({
  id: 'furn-001',
  kind: 'sofa',
  name: 'ソファ',
  x: 5,
  y: 5,
  width: 40,
  height: 30,
  ...overrides,
})

const emptyLayout: SeatLayout = {
  floorId: 'f1',
  floorName: 'Floor 1',
  viewBox: { width: 1600, height: 1154 },
  seats: [],
  teams: [],
  facilities: [],
  furniture: [],
}

describe('rectsOfKinds', () => {
  it('単一種別の矩形を rect 形式(x,y,w,h)へ変換して返す', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ x: 1, y: 2, width: 3, height: 4 })] }
    const rects = rectsOfKinds(layout, ['seat'])
    expect(rects).toEqual([{ x: 1, y: 2, w: 3, h: 4 }])
  })

  it('team は area をそのまま rect として返す', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team()] }
    const rects = rectsOfKinds(layout, ['team'])
    expect(rects).toEqual([{ x: 10, y: 20, w: 300, h: 200 }])
  })

  it('複数種別を同時に flatMap して集める', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      seats: [seat()],
      facilities: [facility()],
      furniture: [furniture()],
    }
    const rects = rectsOfKinds(layout, ['seat', 'facility', 'furniture'])
    expect(rects).toHaveLength(3)
  })

  it('except に一致する要素だけを除外する', () => {
    const s1 = seat({ id: 's-1' })
    const s2 = seat({ id: 's-2', x: 100 })
    const layout: SeatLayout = { ...emptyLayout, seats: [s1, s2] }
    const rects = rectsOfKinds(layout, ['seat'], { kind: 'seat', id: 's-1' })
    expect(rects).toEqual([{ x: 100, y: 0, w: 100, h: 80 }])
  })

  it('except の kind が対象種別と異なる場合は除外しない', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1' })] }
    const rects = rectsOfKinds(layout, ['seat'], { kind: 'team', id: 's-1' })
    expect(rects).toHaveLength(1)
  })

  it('kinds が空配列なら空配列を返す', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat()] }
    expect(rectsOfKinds(layout, [])).toEqual([])
  })

  it('except が null なら何も除外しない(既定値)', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat()] }
    expect(rectsOfKinds(layout, ['seat'])).toHaveLength(1)
  })

  it('該当データが無い種別は空配列扱いで無視される', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat()] }
    const rects = rectsOfKinds(layout, ['seat', 'team', 'facility', 'furniture'])
    expect(rects).toHaveLength(1)
  })
})

describe('rectOfRef', () => {
  it('存在するidの矩形を返す', () => {
    const layout: SeatLayout = { ...emptyLayout, furniture: [furniture({ id: 'furn-005', x: 9, y: 8, width: 7, height: 6 })] }
    const rect = rectOfRef(layout, { kind: 'furniture', id: 'furn-005' })
    expect(rect).toEqual({ x: 9, y: 8, w: 7, h: 6 })
  })

  it('存在しないidは null を返す', () => {
    const layout: SeatLayout = { ...emptyLayout, facilities: [facility({ id: 'fac-01' })] }
    const rect = rectOfRef(layout, { kind: 'facility', id: 'fac-does-not-exist' })
    expect(rect).toBeNull()
  })

  it('kind が一致しても種別内のリストが空なら null', () => {
    const rect = rectOfRef(emptyLayout, { kind: 'team', id: 'team-01' })
    expect(rect).toBeNull()
  })
})
