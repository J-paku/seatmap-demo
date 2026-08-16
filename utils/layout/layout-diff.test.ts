import { describe, it, expect } from 'vitest'
import { countLayoutChanges } from './layout-diff'
import type { Seat, Team, Facility, Furniture, SeatLayout } from '@/types'

const makeSeat = (overrides: Partial<Seat> = {}): Seat => ({
  id: 's1',
  teamId: 't1',
  x: 0,
  y: 0,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId: null,
  ...overrides,
})

const makeTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 't1',
  idPrefix: 't1',
  name: 'Team1',
  color: '#000000',
  area: { x: 0, y: 0, w: 100, h: 100 },
  ...overrides,
})

const makeFacility = (overrides: Partial<Facility> = {}): Facility => ({
  id: 'f1',
  name: 'Meeting1',
  kind: 'meeting',
  x: 0,
  y: 0,
  width: 200,
  height: 150,
  ...overrides,
})

const makeFurniture = (overrides: Partial<Furniture> = {}): Furniture => ({
  id: 'fu1',
  kind: 'table',
  name: '',
  x: 0,
  y: 0,
  width: 50,
  height: 50,
  ...overrides,
})

const makeLayout = (overrides: Partial<SeatLayout> = {}): SeatLayout => ({
  floorId: 'floor1',
  floorName: 'Floor1',
  viewBox: { width: 1600, height: 1154 },
  seats: [],
  teams: [],
  facilities: [],
  furniture: [],
  ...overrides,
})

describe('countLayoutChanges', () => {
  it('baseline と current が同一なら0件', () => {
    const baseline = makeLayout({ seats: [makeSeat()], teams: [makeTeam()] })
    const current = makeLayout({ seats: [makeSeat()], teams: [makeTeam()] })
    expect(countLayoutChanges(baseline, current)).toBe(0)
  })

  it('チームに属さない座席が1つ動けば1件', () => {
    const baseline = makeLayout({
      seats: [makeSeat({ x: 0 })],
      teams: [makeTeam()],
    })
    const current = makeLayout({
      seats: [makeSeat({ x: 50 })],
      teams: [makeTeam()],
    })
    expect(countLayoutChanges(baseline, current)).toBe(1)
  })

  it('チームが動き所属座席も一緒に動いた場合は座席側を二重計上しない(合計1件)', () => {
    const baseline = makeLayout({
      teams: [makeTeam({ area: { x: 0, y: 0, w: 100, h: 100 } })],
      seats: [makeSeat({ teamId: 't1', x: 0 })],
    })
    const current = makeLayout({
      teams: [makeTeam({ area: { x: 50, y: 0, w: 100, h: 100 } })],
      seats: [makeSeat({ teamId: 't1', x: 50 })],
    })
    expect(countLayoutChanges(baseline, current)).toBe(1)
  })

  it('会議室(facility)の変更を1件として数える', () => {
    const baseline = makeLayout({ facilities: [makeFacility({ x: 0 })] })
    const current = makeLayout({ facilities: [makeFacility({ x: 30 })] })
    expect(countLayoutChanges(baseline, current)).toBe(1)
  })

  it('家具(furniture)の変更を1件として数える', () => {
    const baseline = makeLayout({ furniture: [makeFurniture({ x: 0 })] })
    const current = makeLayout({ furniture: [makeFurniture({ x: 30 })] })
    expect(countLayoutChanges(baseline, current)).toBe(1)
  })

  it('座席の追加(baseline に無い id)は1件として数える', () => {
    const baseline = makeLayout({ seats: [], teams: [makeTeam()] })
    const current = makeLayout({ seats: [makeSeat()], teams: [makeTeam()] })
    expect(countLayoutChanges(baseline, current)).toBe(1)
  })

  it('座席の削除(current に無い id)は1件として数える', () => {
    const baseline = makeLayout({ seats: [makeSeat()], teams: [makeTeam()] })
    const current = makeLayout({ seats: [], teams: [makeTeam()] })
    expect(countLayoutChanges(baseline, current)).toBe(1)
  })

  it('座席がチーム間を移動し、両チームとも変更されていなければ1件', () => {
    const baseline = makeLayout({
      teams: [makeTeam({ id: 'tA', idPrefix: 'tA' }), makeTeam({ id: 'tB', idPrefix: 'tB' })],
      seats: [makeSeat({ teamId: 'tA' })],
    })
    const current = makeLayout({
      teams: [makeTeam({ id: 'tA', idPrefix: 'tA' }), makeTeam({ id: 'tB', idPrefix: 'tB' })],
      seats: [makeSeat({ teamId: 'tB' })],
    })
    expect(countLayoutChanges(baseline, current)).toBe(1)
  })

  it('座席がチーム間を移動し、移動先チームも変更されている場合は座席側を除外して1件(チーム分のみ)', () => {
    const baseline = makeLayout({
      teams: [
        makeTeam({ id: 'tA', idPrefix: 'tA', area: { x: 0, y: 0, w: 100, h: 100 } }),
        makeTeam({ id: 'tB', idPrefix: 'tB', area: { x: 0, y: 0, w: 100, h: 100 } }),
      ],
      seats: [makeSeat({ teamId: 'tA' })],
    })
    const current = makeLayout({
      teams: [
        makeTeam({ id: 'tA', idPrefix: 'tA', area: { x: 0, y: 0, w: 100, h: 100 } }),
        makeTeam({ id: 'tB', idPrefix: 'tB', area: { x: 50, y: 0, w: 100, h: 100 } }),
      ],
      seats: [makeSeat({ teamId: 'tB' })],
    })
    expect(countLayoutChanges(baseline, current)).toBe(1)
  })

  it('変更されたチームに属する座席と属さない座席が混在する場合、属さない分だけを追加計上する', () => {
    const baseline = makeLayout({
      teams: [
        makeTeam({ id: 't1', idPrefix: 't1', area: { x: 0, y: 0, w: 100, h: 100 } }),
        makeTeam({ id: 't2', idPrefix: 't2', area: { x: 0, y: 0, w: 100, h: 100 } }),
      ],
      seats: [
        makeSeat({ id: 'seatA', teamId: 't1', x: 0 }),
        makeSeat({ id: 'seatB', teamId: 't2', x: 0 }),
      ],
    })
    const current = makeLayout({
      teams: [
        makeTeam({ id: 't1', idPrefix: 't1', area: { x: 50, y: 0, w: 100, h: 100 } }),
        makeTeam({ id: 't2', idPrefix: 't2', area: { x: 0, y: 0, w: 100, h: 100 } }),
      ],
      seats: [
        makeSeat({ id: 'seatA', teamId: 't1', x: 50 }),
        makeSeat({ id: 'seatB', teamId: 't2', x: 30 }),
      ],
    })
    // t1(チーム変更 1件) + seatA(t1所属なので除外) + seatB(t2は無変更なので計上 1件) = 2件
    expect(countLayoutChanges(baseline, current)).toBe(2)
  })

  it('複数カテゴリの変更を合算する(facility + furniture + 座席)', () => {
    const baseline = makeLayout({
      facilities: [makeFacility({ x: 0 })],
      furniture: [makeFurniture({ x: 0 })],
      teams: [makeTeam()],
      seats: [makeSeat({ x: 0 })],
    })
    const current = makeLayout({
      facilities: [makeFacility({ x: 50 })],
      furniture: [makeFurniture({ x: 50 })],
      teams: [makeTeam()],
      seats: [makeSeat({ x: 50 })],
    })
    expect(countLayoutChanges(baseline, current)).toBe(3)
  })

  it('同一の値でもキー順が異なるオブジェクトは文字列比較で「変更あり」側へ倒れる(実装の既知挙動)', () => {
    const seatA: Seat = {
      id: 's1',
      teamId: 't1',
      x: 0,
      y: 0,
      width: 105,
      height: 75,
      rotation: 0,
      employeeId: null,
    }
    const seatAReordered: Seat = {
      teamId: 't1',
      id: 's1',
      y: 0,
      x: 0,
      height: 75,
      width: 105,
      employeeId: null,
      rotation: 0,
    }
    const baseline = makeLayout({ seats: [seatA] })
    const current = makeLayout({ seats: [seatAReordered] })
    expect(countLayoutChanges(baseline, current)).toBe(1)
  })
})
