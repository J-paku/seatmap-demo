import { describe, it, expect } from 'vitest'
import { buildTeamColorRegistry, resolveTeamColor } from './team-colors'
import type { TeamColorEntry } from './team-colors'
import type { Team } from '@/types'

const makeTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 'team-a',
  idPrefix: 'A',
  name: 'チームA',
  color: '#336699',
  area: { x: 0, y: 0, w: 100, h: 100 },
  ...overrides,
})

describe('buildTeamColorRegistry', () => {
  it('チームが無ければ空の Map を返す', () => {
    const registry = buildTeamColorRegistry([])
    expect(registry.size).toBe(0)
  })

  it('team.color を背景色として登録し、対比の高い方(白)を前景色に選ぶ', () => {
    const team = makeTeam({ id: 'team-a', color: '#336699' })
    const registry = buildTeamColorRegistry([team])
    expect(registry.get('team-a')).toEqual({ background: '#336699', foreground: '#ffffff', index: 0 })
  })

  it('背景が白なら前景は黒、背景が黒なら前景は白になる(WCAG対比の高い方を選ぶ)', () => {
    const white = makeTeam({ id: 'team-white', color: '#ffffff' })
    const black = makeTeam({ id: 'team-black', color: '#000000' })
    const registry = buildTeamColorRegistry([white, black])
    expect(registry.get('team-white')?.foreground).toBe('#000000')
    expect(registry.get('team-black')?.foreground).toBe('#ffffff')
  })

  it('index は配列の並び順(0始まり)を反映する', () => {
    const teams = [makeTeam({ id: 'team-a' }), makeTeam({ id: 'team-b' }), makeTeam({ id: 'team-c' })]
    const registry = buildTeamColorRegistry(teams)
    expect(registry.get('team-a')?.index).toBe(0)
    expect(registry.get('team-b')?.index).toBe(1)
    expect(registry.get('team-c')?.index).toBe(2)
  })

  it('team.id が重複する場合は後勝ちで上書きされる(index も上書き後の値になる)', () => {
    const teams = [makeTeam({ id: 'dup', color: '#ffffff' }), makeTeam({ id: 'dup', color: '#000000' })]
    const registry = buildTeamColorRegistry(teams)
    expect(registry.size).toBe(1)
    expect(registry.get('dup')?.background).toBe('#000000')
    expect(registry.get('dup')?.index).toBe(1)
  })
})

describe('resolveTeamColor', () => {
  it('登録済みの teamId ならレジストリの値をそのまま返す', () => {
    const registry = buildTeamColorRegistry([makeTeam({ id: 'team-a', color: '#336699' })])
    const result = resolveTeamColor(registry, 'team-a', 'フォールバック名')
    expect(result).toEqual({ background: '#336699', foreground: '#ffffff', index: 0 })
  })

  it('未登録の teamId は名前ハッシュから決定論的なフォールバック色(背景・前景)を導出する', () => {
    const registry = new Map<string, TeamColorEntry>()
    const result = resolveTeamColor(registry, 'unknown-id', 'チームA')
    expect(result.background).toBe('#d629bf')
    expect(result.foreground).toBe('#000000')
    expect(result.index).toBe(0)
  })

  it('同じフォールバック名なら teamId が違っても常に同じ背景色を返す(決定論的)', () => {
    const registry = new Map<string, TeamColorEntry>()
    const first = resolveTeamColor(registry, 'unknown-id-1', '未登録チーム')
    const second = resolveTeamColor(registry, 'unknown-id-2', '未登録チーム')
    expect(first.background).toBe(second.background)
    expect(first.background).toBe('#a829d6')
    expect(first.foreground).toBe('#ffffff')
  })

  it('未登録名が異なれば色も異なりうる', () => {
    const registry = new Map<string, TeamColorEntry>()
    const a = resolveTeamColor(registry, 'id-a', 'チームA')
    const b = resolveTeamColor(registry, 'id-b', '未登録チーム')
    expect(a.background).not.toBe(b.background)
  })

  it('フォールバック時の index は呼び出し時点のレジストリサイズを引き継ぐ', () => {
    const registry = buildTeamColorRegistry([makeTeam({ id: 'team-a' }), makeTeam({ id: 'team-b' })])
    const result = resolveTeamColor(registry, 'unregistered', 'チームC')
    expect(result.index).toBe(2)
  })
})
