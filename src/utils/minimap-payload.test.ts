import { describe, it, expect } from 'vitest'
import { buildMinimapPayload } from './minimap-payload'
import { resolveTeamColor } from './team-colors'
import type { TeamColorEntry } from './team-colors'
import type { Facility, Furniture, SeatLayout, Team } from '@/types'

const makeTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 'team-a',
  idPrefix: 'A',
  name: 'チームA',
  color: '#336699',
  area: { x: 0, y: 0, w: 100, h: 100 },
  ...overrides,
})

const makeFacility = (overrides: Partial<Facility> = {}): Facility => ({
  id: 'facility-1',
  name: '会議室1',
  kind: 'meeting',
  x: 10,
  y: 20,
  width: 30,
  height: 40,
  ...overrides,
})

const makeFurniture = (overrides: Partial<Furniture> = {}): Furniture => ({
  id: 'furniture-1',
  kind: 'wall',
  name: '',
  x: 1,
  y: 2,
  width: 3,
  height: 4,
  ...overrides,
})

const makeLayout = (overrides: Partial<SeatLayout> = {}): SeatLayout => ({
  floorId: 'floor-1',
  floorName: '1F',
  viewBox: { width: 1000, height: 800 },
  seats: [],
  teams: [],
  facilities: [],
  furniture: [],
  ...overrides,
})

describe('buildMinimapPayload', () => {
  it('空レイアウトなら areas・furniture が空配列、currentArea が null、viewBox は同一参照で渡る', () => {
    const layout = makeLayout()
    const result = buildMinimapPayload(layout, new Map(), null)
    expect(result).toEqual({
      areas: [],
      furniture: [],
      currentArea: null,
      viewBox: { width: 1000, height: 800 },
    })
    expect(result.viewBox).toBe(layout.viewBox)
  })

  it('チームの area を idPrefix・座標・ラベル・解決済み色で MinimapArea に変換する', () => {
    const team = makeTeam({
      id: 'team-a',
      idPrefix: 'A',
      name: 'チームA',
      color: '#112233',
      area: { x: 5, y: 6, w: 200, h: 150 },
    })
    const layout = makeLayout({ teams: [team] })
    const colorMap = new Map<string, TeamColorEntry>()
    const result = buildMinimapPayload(layout, colorMap, null)
    const expectedColor = resolveTeamColor(colorMap, team.id, team.name).background
    expect(result.areas).toEqual([{ idPrefix: 'A', x: 5, y: 6, w: 200, h: 150, label: 'チームA', dotColor: expectedColor }])
  })

  it('colorMap に登録済みのチームはレジストリの背景色をそのまま使う', () => {
    const team = makeTeam({ id: 'team-a', color: '#112233' })
    const colorMap = new Map<string, TeamColorEntry>([['team-a', { background: '#ABCDEF', foreground: '#000000', index: 0 }]])
    const layout = makeLayout({ teams: [team] })
    const result = buildMinimapPayload(layout, colorMap, null)
    expect(result.areas[0].dotColor).toBe('#ABCDEF')
  })

  it('facility の kind が aisle なら MinimapKind も aisle、それ以外(meeting/booth/common)は facility になる', () => {
    const aisle = makeFacility({ id: 'f-aisle', kind: 'aisle', name: '' })
    const meeting = makeFacility({ id: 'f-meeting', kind: 'meeting', name: '会議室A' })
    const booth = makeFacility({ id: 'f-booth', kind: 'booth', name: 'ブースB' })
    const common = makeFacility({ id: 'f-common', kind: 'common', name: '共有スペース' })
    const layout = makeLayout({ facilities: [aisle, meeting, booth, common] })
    const result = buildMinimapPayload(layout, new Map(), null)
    expect(result.furniture.map((item) => ({ id: item.id, kind: item.kind }))).toEqual([
      { id: 'f-aisle', kind: 'aisle' },
      { id: 'f-meeting', kind: 'facility' },
      { id: 'f-booth', kind: 'facility' },
      { id: 'f-common', kind: 'facility' },
    ])
  })

  it('facility は名前・座標・サイズをそのまま MinimapFurniture へ引き継ぐ', () => {
    const facility = makeFacility({ id: 'f-1', name: '会議室X', x: 11, y: 22, width: 33, height: 44 })
    const layout = makeLayout({ facilities: [facility] })
    const result = buildMinimapPayload(layout, new Map(), null)
    expect(result.furniture[0]).toEqual({ id: 'f-1', kind: 'facility', name: '会議室X', x: 11, y: 22, width: 33, height: 44 })
  })

  it('建設設備の家具(wall等)は structure、それ以外(table等)は object に区分される', () => {
    const wall = makeFurniture({ id: 'furn-wall', kind: 'wall' })
    const table = makeFurniture({ id: 'furn-table', kind: 'table', name: 'テーブル' })
    const layout = makeLayout({ furniture: [wall, table] })
    const result = buildMinimapPayload(layout, new Map(), null)
    expect(result.furniture.map((item) => ({ id: item.id, kind: item.kind }))).toEqual([
      { id: 'furn-wall', kind: 'structure' },
      { id: 'furn-table', kind: 'object' },
    ])
  })

  it('家具は元の name の有無にかかわらずミニマップでは常に空文字になる', () => {
    const table = makeFurniture({ id: 'furn-table', kind: 'table', name: 'テーブル' })
    const layout = makeLayout({ furniture: [table] })
    const result = buildMinimapPayload(layout, new Map(), null)
    expect(result.furniture[0].name).toBe('')
  })

  it('furniture 配列は facilities の変換結果の後に furniture の変換結果が続く順序で連結される', () => {
    const facility = makeFacility({ id: 'f-1' })
    const item = makeFurniture({ id: 'furn-1' })
    const layout = makeLayout({ facilities: [facility], furniture: [item] })
    const result = buildMinimapPayload(layout, new Map(), null)
    expect(result.furniture.map((entry) => entry.id)).toEqual(['f-1', 'furn-1'])
  })

  it('currentTeamId に一致するチームがあれば currentArea を返す', () => {
    const teamA = makeTeam({ id: 'team-a', name: 'チームA' })
    const teamB = makeTeam({ id: 'team-b', name: 'チームB' })
    const layout = makeLayout({ teams: [teamA, teamB] })
    const result = buildMinimapPayload(layout, new Map(), 'team-b')
    expect(result.currentArea?.idPrefix).toBe(teamB.idPrefix)
    expect(result.currentArea?.label).toBe('チームB')
  })

  it('currentTeamId が存在しないチームIDなら currentArea は null', () => {
    const team = makeTeam({ id: 'team-a' })
    const layout = makeLayout({ teams: [team] })
    const result = buildMinimapPayload(layout, new Map(), 'team-does-not-exist')
    expect(result.currentArea).toBeNull()
  })

  it('currentTeamId が null なら currentArea は null', () => {
    const team = makeTeam({ id: 'team-a' })
    const layout = makeLayout({ teams: [team] })
    const result = buildMinimapPayload(layout, new Map(), null)
    expect(result.currentArea).toBeNull()
  })
})
