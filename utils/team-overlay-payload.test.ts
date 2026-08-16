import { describe, it, expect } from 'vitest'
import { buildTeamOverlayPayload } from './team-overlay-payload'
import { resolveTeamColor } from './team-colors'
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

// DOMRect のインスタンス化はしない(node 環境にコンストラクタが無いため)。
// buildTeamOverlayPayload は rect を素通しするだけなので、型を満たすプレーンオブジェクトで十分
const makeRect = (overrides: Partial<DOMRect> = {}): DOMRect => ({
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  top: 20,
  left: 10,
  right: 110,
  bottom: 70,
  toJSON: () => ({}),
  ...overrides,
})

describe('buildTeamOverlayPayload', () => {
  it('teamId に一致するチームがあれば teamId・teamName・解決済み色・rect を含むペイロードを返す', () => {
    const team = makeTeam({ id: 'team-a', name: 'チームA' })
    const colorMap = new Map<string, TeamColorEntry>()
    const rect = makeRect()
    const result = buildTeamOverlayPayload([team], colorMap, 'team-a', rect)
    const expectedColor = resolveTeamColor(colorMap, team.id, team.name).background
    expect(result).toEqual({ teamId: 'team-a', teamName: 'チームA', teamColor: expectedColor, rect })
  })

  it('teamId に一致するチームが無ければ null を返す', () => {
    const team = makeTeam({ id: 'team-a' })
    const result = buildTeamOverlayPayload([team], new Map(), 'team-not-found', makeRect())
    expect(result).toBeNull()
  })

  it('渡された rect を同一参照のままペイロードへ引き継ぐ', () => {
    const team = makeTeam({ id: 'team-a' })
    const rect = makeRect()
    const result = buildTeamOverlayPayload([team], new Map(), 'team-a', rect)
    expect(result?.rect).toBe(rect)
  })

  it('colorMap に登録済みのチームはレジストリの背景色を使う', () => {
    const team = makeTeam({ id: 'team-a', color: '#112233' })
    const colorMap = new Map<string, TeamColorEntry>([['team-a', { background: '#ABCDEF', foreground: '#000000', index: 0 }]])
    const result = buildTeamOverlayPayload([team], colorMap, 'team-a', makeRect())
    expect(result?.teamColor).toBe('#ABCDEF')
  })

  it('teams が空配列なら常に null を返す', () => {
    const result = buildTeamOverlayPayload([], new Map(), 'team-a', makeRect())
    expect(result).toBeNull()
  })
})
