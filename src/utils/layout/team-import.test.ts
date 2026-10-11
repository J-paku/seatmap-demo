import { describe, it, expect } from 'vitest'
import { buildTeamImportPlan } from './team-import'
import type { TeamImportSource } from './team-import'
import { rectsIntersect } from './rect'
import type { Rect } from './rect'
import type { Facility, Furniture, Seat, SeatLayout, Team } from '@/types'

const team = (overrides: Partial<Team> & { area: Rect }): Team => ({
  id: 'team-x',
  idPrefix: 'X',
  name: 'Team',
  color: '#000000',
  ...overrides,
})

const seat = (overrides: Partial<Seat> = {}): Seat => ({
  id: 's',
  teamId: 'team-x',
  x: 0,
  y: 0,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId: null,
  ...overrides,
})

const layout = (overrides: Partial<SeatLayout> = {}): SeatLayout => ({
  floorId: 'f1',
  floorName: 'F1',
  viewBox: { width: 1600, height: 1154 },
  seats: [],
  teams: [],
  facilities: [],
  furniture: [],
  ...overrides,
})

describe('buildTeamImportPlan', () => {
  it('空の取り込み元なら空プランを返す', () => {
    const plan = buildTeamImportPlan(layout(), [], { x: 200, y: 200 })
    expect(plan).toEqual({ teams: [], seats: [], stages: [], unplacedCount: 0 })
  })

  it('障害物の無いレイアウトへ1件取り込むと、アンカー中心に採番されたチームが1件・avoid-allで置かれる', () => {
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 } }),
      seats: [seat({ id: 'src-1', x: 20, y: 15, employeeId: 'emp-1' })],
    }
    const plan = buildTeamImportPlan(layout(), [source], { x: 200, y: 200 })

    expect(plan.stages).toEqual(['avoid-all'])
    expect(plan.unplacedCount).toBe(0)
    expect(plan.teams).toEqual([
      { id: 'team-01', idPrefix: 'A', name: 'Team', color: '#000000', area: { x: 150, y: 160, w: 100, h: 80 } },
    ])
    // delta = spot.rect - source.team.area = (150,160)。座席は平行移動+再接頭辞+社員をnull化
    expect(plan.seats).toEqual([
      {
        id: 'A-1',
        teamId: 'team-01',
        x: 170,
        y: 175,
        width: 105,
        height: 75,
        rotation: 0,
        employeeId: null,
        shape: undefined,
        isSizeOverridden: undefined,
      },
    ])
  })

  it('labelX/labelYは引き継がない', () => {
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 }, labelX: 999, labelY: 999 }),
      seats: [],
    }
    const plan = buildTeamImportPlan(layout(), [source], { x: 200, y: 200 })
    expect(plan.teams[0]).not.toHaveProperty('labelX')
    expect(plan.teams[0]).not.toHaveProperty('labelY')
  })

  it('idPrefix/チーム名/チームidが既存と衝突すれば次の空き番へ送る', () => {
    const existing = layout({
      teams: [team({ id: 'team-01', idPrefix: 'A', name: 'Sales', area: { x: 900, y: 900, w: 50, h: 50 } })],
    })
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 }, name: 'Sales' }),
      seats: [],
    }
    const plan = buildTeamImportPlan(existing, [source], { x: 200, y: 200 })
    expect(plan.teams[0].idPrefix).toBe('B')
    expect(plan.teams[0].name).toBe('Sales (2)')
    expect(plan.teams[0].id).toBe('team-02')
  })

  it('「Base」と「Base (2)」が既に使われていれば「Base (3)」まで送る', () => {
    const existing = layout({
      teams: [
        team({ id: 'team-01', idPrefix: 'A', name: 'Base', area: { x: 900, y: 900, w: 10, h: 10 } }),
        team({ id: 'team-02', idPrefix: 'B', name: 'Base (2)', area: { x: 920, y: 900, w: 10, h: 10 } }),
      ],
    })
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 }, name: 'Base' }),
      seats: [],
    }
    const plan = buildTeamImportPlan(existing, [source], { x: 200, y: 200 })
    expect(plan.teams[0].name).toBe('Base (3)')
    expect(plan.teams[0].idPrefix).toBe('C')
    expect(plan.teams[0].id).toBe('team-03')
  })

  it('idPrefixがA〜Zを使い切ると26進の桁上がりでAAへ進む', () => {
    const usedTeams = Array.from({ length: 26 }, (_, i) =>
      team({
        id: `team-${i}`,
        idPrefix: String.fromCharCode(65 + i),
        name: `T${i}`,
        area: { x: 5000 + i * 20, y: 5000, w: 5, h: 5 },
      })
    )
    const existing = layout({ teams: usedTeams })
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 } }),
      seats: [],
    }
    const plan = buildTeamImportPlan(existing, [source], { x: 200, y: 200 })
    expect(plan.teams[0].idPrefix).toBe('AA')
  })

  it('座席IDに「-」が無ければ全体を連番部とみなして再接頭辞化する', () => {
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 } }),
      seats: [seat({ id: 'seat1' })],
    }
    const plan = buildTeamImportPlan(layout(), [source], { x: 200, y: 200 })
    expect(plan.teams[0].idPrefix).toBe('A')
    expect(plan.seats[0].id).toBe('A-seat1')
  })

  it('複製後に座席IDが重複したら "-2" を足して回避する', () => {
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 } }),
      seats: [seat({ id: 'x-001' }), seat({ id: 'y-001' })],
    }
    const plan = buildTeamImportPlan(layout(), [source], { x: 200, y: 200 })
    expect(plan.seats.map((s) => s.id)).toEqual(['A-001', 'A-001-2'])
  })

  it('複製した座席の社員は必ずnullにする(元がemployeeIdを持っていても連れてこない)', () => {
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 } }),
      seats: [seat({ id: 's-1', employeeId: 'emp-99' })],
    }
    const plan = buildTeamImportPlan(layout(), [source], { x: 200, y: 200 })
    expect(plan.seats[0].employeeId).toBeNull()
  })

  it('施設(会議室)がフロア全域を覆っていてもavoid-teams段は施設を見ないため、同じ位置にすぐ置ける', () => {
    // フロア全域を覆う施設にすると、avoid-all は「①チーム枠+設備+フロア外」で
    // 必ず落ちる一方、avoid-teams は teamAreaOverlaps しか見ない(施設は無視)ため
    // 同じアンカー中心位置がそのまま通る。小さい障害物だと avoid-all がスパイラルの
    // 別の空き位置を見つけてしまい結果が一意に定まらないため、全域covered で確定させる
    const existing = layout({
      facilities: [{ id: 'fac-01', name: 'Room', kind: 'meeting', x: 0, y: 0, width: 1600, height: 1154 } as Facility],
    })
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 } }),
      seats: [],
    }
    const plan = buildTeamImportPlan(existing, [source], { x: 200, y: 200 })
    expect(plan.teams[0].area).toEqual({ x: 150, y: 160, w: 100, h: 80 })
    expect(plan.stages).toEqual(['avoid-teams'])
  })

  it('家具がフロア全域を覆っていてもavoid-teams段は家具を見ないため、同じ位置にすぐ置ける', () => {
    const existing = layout({
      furniture: [{ id: 'furn-001', kind: 'wall', name: '', x: 0, y: 0, width: 1600, height: 1154 } as Furniture],
    })
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 } }),
      seats: [],
    }
    const plan = buildTeamImportPlan(existing, [source], { x: 200, y: 200 })
    expect(plan.teams[0].area).toEqual({ x: 150, y: 160, w: 100, h: 80 })
    expect(plan.stages).toEqual(['avoid-teams'])
  })

  it('チームがフロア全域を覆っていてもforced段まで緩めてアンカー中心に置く', () => {
    const existing = layout({
      teams: [team({ id: 'team-01', idPrefix: 'A', name: 'Big', area: { x: 0, y: 0, w: 1600, h: 1154 } })],
    })
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 } }),
      seats: [],
    }
    const plan = buildTeamImportPlan(existing, [source], { x: 200, y: 200 })
    expect(plan.teams[0].area).toEqual({ x: 150, y: 160, w: 100, h: 80 })
    expect(plan.stages).toEqual(['forced'])
  })

  it('同じアンカーへ複数件取り込んでも、取り込んだ枠同士は重ならない', () => {
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 } }),
      seats: [],
    }
    const plan = buildTeamImportPlan(layout(), [source, source], { x: 200, y: 200 })
    expect(plan.teams).toHaveLength(2)
    expect(plan.unplacedCount).toBe(0)
    const [first, second] = plan.teams
    const firstRect: Rect = { x: first.area.x, y: first.area.y, w: first.area.w, h: first.area.h }
    const secondRect: Rect = { x: second.area.x, y: second.area.y, w: second.area.w, h: second.area.h }
    expect(rectsIntersect(firstRect, secondRect)).toBe(false)
    // idPrefix・チームidも重複しない
    expect(first.idPrefix).not.toBe(second.idPrefix)
    expect(first.id).not.toBe(second.id)
  })

  it('チーム枠がフロアより大きく、どこにも置けなければunplacedCountを積んで何も追加しない', () => {
    const tinyLayout = layout({ viewBox: { width: 50, height: 50 } })
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 100 } }),
      seats: [seat({ id: 's-1' })],
    }
    const plan = buildTeamImportPlan(tinyLayout, [source], { x: 10, y: 10 })
    expect(plan).toEqual({ teams: [], seats: [], stages: [], unplacedCount: 1 })
  })

  it('色は取り込み元のcolorをそのまま引き継ぐ', () => {
    const source: TeamImportSource = {
      team: team({ area: { x: 0, y: 0, w: 100, h: 80 }, color: '#abcdef' }),
      seats: [],
    }
    const plan = buildTeamImportPlan(layout(), [source], { x: 200, y: 200 })
    expect(plan.teams[0].color).toBe('#abcdef')
  })
})
