import { describe, it, expect } from 'vitest'
import {
  findOverlappingSeat,
  findTeamContaining,
  lockedForMoveMessage,
  lockedMessage,
  placementBlocked,
  placementBlockReason,
  seatOverlapsFixture,
  teamAreaOverlaps,
} from './layout-rules'
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
  area: { x: 0, y: 0, w: 300, h: 200 },
  ...overrides,
})

const facility = (overrides: Partial<Facility> = {}): Facility => ({
  id: 'fac-01',
  name: '会議室1',
  kind: 'meeting',
  x: 0,
  y: 0,
  width: 120,
  height: 90,
  ...overrides,
})

const furniture = (overrides: Partial<Furniture> = {}): Furniture => ({
  id: 'furn-001',
  kind: 'sofa',
  name: 'ソファ',
  x: 0,
  y: 0,
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

describe('teamAreaOverlaps', () => {
  it('対象チーム自身は判定から除外する(同じ area でも重ならない扱い)', () => {
    const teams = [team({ id: 'team-01', area: { x: 0, y: 0, w: 100, h: 100 } })]
    expect(teamAreaOverlaps(teams, 'team-01', { x: 0, y: 0, w: 100, h: 100 })).toBe(false)
  })

  it('他チームと重なる矩形は true', () => {
    const teams = [team({ id: 'team-01', area: { x: 0, y: 0, w: 100, h: 100 } })]
    expect(teamAreaOverlaps(teams, 'team-02', { x: 50, y: 50, w: 100, h: 100 })).toBe(true)
  })

  it('接触のみ(端が触れるだけ)は重なりに数えない', () => {
    const teams = [team({ id: 'team-01', area: { x: 0, y: 0, w: 100, h: 100 } })]
    expect(teamAreaOverlaps(teams, 'team-02', { x: 100, y: 0, w: 100, h: 100 })).toBe(false)
  })

  it('チームが1件も無ければ false', () => {
    expect(teamAreaOverlaps([], 'team-01', { x: 0, y: 0, w: 100, h: 100 })).toBe(false)
  })
})

describe('seatOverlapsFixture', () => {
  it('会議室と重なる候補は true', () => {
    const layout: SeatLayout = { ...emptyLayout, facilities: [facility({ x: 0, y: 0, width: 100, height: 100 })] }
    expect(seatOverlapsFixture(layout, { x: 50, y: 50, w: 20, h: 20 })).toBe(true)
  })

  it('家具と重なる候補も true(家具も物理障害物として扱う)', () => {
    const layout: SeatLayout = { ...emptyLayout, furniture: [furniture({ x: 0, y: 0, width: 100, height: 100 })] }
    expect(seatOverlapsFixture(layout, { x: 50, y: 50, w: 20, h: 20 })).toBe(true)
  })

  it('何とも重ならなければ false', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      facilities: [facility({ x: 0, y: 0, width: 100, height: 100 })],
    }
    expect(seatOverlapsFixture(layout, { x: 200, y: 200, w: 20, h: 20 })).toBe(false)
  })
})

describe('findOverlappingSeat', () => {
  it('重なる他座席を返す', () => {
    const seats = [seat({ id: 's-1', x: 0, y: 0, width: 100, height: 80 })]
    const found = findOverlappingSeat(seats, 's-2', { x: 50, y: 50, w: 20, h: 20 })
    expect(found?.id).toBe('s-1')
  })

  it('excludeSeatId に一致する座席自身は対象から除外する', () => {
    const seats = [seat({ id: 's-1', x: 0, y: 0, width: 100, height: 80 })]
    const found = findOverlappingSeat(seats, 's-1', { x: 50, y: 50, w: 20, h: 20 })
    expect(found).toBeNull()
  })

  it('重なる座席が無ければ null', () => {
    const seats = [seat({ id: 's-1', x: 0, y: 0, width: 100, height: 80 })]
    const found = findOverlappingSeat(seats, 's-2', { x: 500, y: 500, w: 20, h: 20 })
    expect(found).toBeNull()
  })

  it('複数重なる場合は配列の先頭一致(find)を返す', () => {
    const seats = [
      seat({ id: 's-1', x: 0, y: 0, width: 100, height: 80 }),
      seat({ id: 's-2', x: 10, y: 10, width: 100, height: 80 }),
    ]
    const found = findOverlappingSeat(seats, 's-3', { x: 20, y: 20, w: 20, h: 20 })
    expect(found?.id).toBe('s-1')
  })
})

describe('findTeamContaining', () => {
  it('候補矩形の中心を含むチームを返す', () => {
    const teams = [team({ id: 'team-01', area: { x: 0, y: 0, w: 300, h: 200 } })]
    // candidate中心 = (150, 100) は area 内
    const found = findTeamContaining(teams, 'team-02', { x: 100, y: 50, w: 100, h: 100 })
    expect(found?.id).toBe('team-01')
  })

  it('excludeTeamId に一致するチームは対象から除外する', () => {
    const teams = [team({ id: 'team-01', area: { x: 0, y: 0, w: 300, h: 200 } })]
    const found = findTeamContaining(teams, 'team-01', { x: 100, y: 50, w: 100, h: 100 })
    expect(found).toBeNull()
  })

  it('中心が area 境界ちょうど(右下端)でも含む(pointInRect は境界含む)', () => {
    const teams = [team({ id: 'team-01', area: { x: 0, y: 0, w: 200, h: 200 } })]
    // candidate中心 = (200, 200) は area の右下端と一致
    const found = findTeamContaining(teams, 'team-02', { x: 100, y: 100, w: 200, h: 200 })
    expect(found?.id).toBe('team-01')
  })

  it('中心がどのチームにも属さなければ null', () => {
    const teams = [team({ id: 'team-01', area: { x: 0, y: 0, w: 300, h: 200 } })]
    const found = findTeamContaining(teams, 'team-02', { x: 1000, y: 1000, w: 20, h: 20 })
    expect(found).toBeNull()
  })
})

describe('placementBlockReason / placementBlocked', () => {
  it('チーム枠(4px内側インセット)と重なると overlap を返す', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team({ area: { x: 0, y: 0, w: 100, h: 100 } })] }
    // インセット後の枠は (4,4)-(96,96)。候補(50,50,10,10)は完全に内側で重なる
    const reason = placementBlockReason(layout, null, { x: 50, y: 50, w: 10, h: 10 })
    expect(reason).toEqual({ kind: 'overlap', rects: [{ x: 4, y: 4, w: 92, h: 92 }] })
  })

  it('インセット分だけ縁が空くので、枠の最外縁(0〜4px)ぎりぎりの重なりはブロックしない', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team({ area: { x: 0, y: 0, w: 100, h: 100 } })] }
    // 候補は x:-10〜0 の範囲(左側の外側)。インセット後の枠は x>=4 から始まるので重ならない
    const reason = placementBlockReason(layout, null, { x: -10, y: 50, w: 10, h: 10 })
    expect(reason).toBeNull()
  })

  it('会議室(facility)はインセット無しでそのまま障害物になる', () => {
    const layout: SeatLayout = { ...emptyLayout, facilities: [facility({ x: 0, y: 0, width: 100, height: 100 })] }
    const reason = placementBlockReason(layout, null, { x: 0, y: 0, w: 10, h: 10 })
    expect(reason).toEqual({ kind: 'overlap', rects: [{ x: 0, y: 0, w: 100, h: 100 }] })
  })

  it('家具(furniture)は障害物に含まれない(重なり配置を許す)', () => {
    const layout: SeatLayout = { ...emptyLayout, furniture: [furniture({ x: 0, y: 0, width: 100, height: 100 })] }
    const reason = placementBlockReason(layout, null, { x: 0, y: 0, w: 10, h: 10 })
    expect(reason).toBeNull()
    expect(placementBlocked(layout, null, { x: 0, y: 0, w: 10, h: 10 })).toBe(false)
  })

  it('self に一致するチームは自身を除外して判定する', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team({ id: 'team-01', area: { x: 0, y: 0, w: 100, h: 100 } })] }
    const reason = placementBlockReason(layout, { kind: 'team', id: 'team-01' }, { x: 50, y: 50, w: 10, h: 10 })
    expect(reason).toBeNull()
  })

  it('複数障害物と重なる場合は rects に全件を積む', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      teams: [team({ id: 'team-01', area: { x: 0, y: 0, w: 100, h: 100 } })],
      facilities: [facility({ id: 'fac-01', x: 0, y: 0, width: 100, height: 100 })],
    }
    const reason = placementBlockReason(layout, null, { x: 50, y: 50, w: 10, h: 10 })
    expect(reason?.rects).toHaveLength(2)
  })

  it('placementBlocked は placementBlockReason の真偽値版', () => {
    const layout: SeatLayout = { ...emptyLayout, facilities: [facility({ x: 0, y: 0, width: 100, height: 100 })] }
    expect(placementBlocked(layout, null, { x: 0, y: 0, w: 10, h: 10 })).toBe(true)
    expect(placementBlocked(layout, null, { x: 500, y: 500, w: 10, h: 10 })).toBe(false)
  })
})

describe('lockedMessage', () => {
  it('team.locked が true なら理由文言を返す', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team({ id: 'team-01', name: '営業部', locked: true })] }
    const msg = lockedMessage(layout, { kind: 'team', id: 'team-01' }, '移動')
    expect(msg).toBe('「営業部」はロックまたはレイアウト固定中のため移動できません')
  })

  it('team.fixedLayout があっても理由文言を返す', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      teams: [team({ id: 'team-01', name: '開発部', fixedLayout: { rows: 2, cols: 4 } })],
    }
    const msg = lockedMessage(layout, { kind: 'team', id: 'team-01' }, 'リサイズ')
    expect(msg).toBe('「開発部」はロックまたはレイアウト固定中のためリサイズできません')
  })

  it('team が locked も fixedLayout も無ければ null', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team({ id: 'team-01' })] }
    expect(lockedMessage(layout, { kind: 'team', id: 'team-01' }, '移動')).toBeNull()
  })

  it('facility.locked が true なら理由文言を返す', () => {
    const layout: SeatLayout = { ...emptyLayout, facilities: [facility({ id: 'fac-01', name: '会議室A', locked: true })] }
    const msg = lockedMessage(layout, { kind: 'facility', id: 'fac-01' }, '削除')
    expect(msg).toBe('「会議室A」はロックまたはレイアウト固定中のため削除できません')
  })

  it('furniture.locked が true かつ name があれば name を使う', () => {
    const layout: SeatLayout = { ...emptyLayout, furniture: [furniture({ id: 'furn-001', name: 'ソファ', locked: true })] }
    const msg = lockedMessage(layout, { kind: 'furniture', id: 'furn-001' }, '移動')
    expect(msg).toBe('「ソファ」はロックまたはレイアウト固定中のため移動できません')
  })

  it('furniture.locked が true かつ name が空文字(建設設備)なら「家具」を使う', () => {
    const layout: SeatLayout = { ...emptyLayout, furniture: [furniture({ id: 'furn-002', name: '', locked: true })] }
    const msg = lockedMessage(layout, { kind: 'furniture', id: 'furn-002' }, '移動')
    expect(msg).toBe('「家具」はロックまたはレイアウト固定中のため移動できません')
  })

  it('対象が存在しなければ null(嘘の許可を返さない)', () => {
    expect(lockedMessage(emptyLayout, { kind: 'team', id: 'no-such-team' }, '移動')).toBeNull()
  })

  it('seat kind は常に null を返す(座席はロックを持たない)', () => {
    expect(lockedMessage(emptyLayout, { kind: 'seat', id: 'seat-x' }, '移動')).toBeNull()
  })
})

describe('lockedForMoveMessage', () => {
  it('fixedLayout だけのチームは移動できる(null)', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      teams: [team({ id: 'team-01', name: '営業部', fixedLayout: { rows: 2, cols: 4 } })],
    }
    expect(lockedForMoveMessage(layout, { kind: 'team', id: 'team-01' })).toBeNull()
  })

  it('locked のチームは移動を拒む', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team({ id: 'team-01', name: '営業部', locked: true })] }
    expect(lockedForMoveMessage(layout, { kind: 'team', id: 'team-01' })).toBe('「営業部」はロック中のため移動できません')
  })

  it('locked の会議室も同じ骨格の文言を返す', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      facilities: [facility({ id: 'fac-01', name: '会議室A', locked: true })],
    }
    expect(lockedForMoveMessage(layout, { kind: 'facility', id: 'fac-01' })).toBe(
      '「会議室A」はロック中のため移動できません'
    )
  })

  it('ロックを持たない家具は移動できる(null)', () => {
    const layout: SeatLayout = { ...emptyLayout, furniture: [furniture({ id: 'furn-001', name: 'ソファ' })] }
    expect(lockedForMoveMessage(layout, { kind: 'furniture', id: 'furn-001' })).toBeNull()
  })
})
