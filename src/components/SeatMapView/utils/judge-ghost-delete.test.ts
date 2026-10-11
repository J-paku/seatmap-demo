import { describe, it, expect } from 'vitest'
import { canDeleteGhost, isDeleteConfirmOpen } from './judge-ghost-delete'
import type { Facility, Team } from '@/types'

const FACILITY: Facility = {
  id: 'fac-1',
  name: '会議室A',
  kind: 'meeting',
  x: 0,
  y: 0,
  width: 200,
  height: 150,
}

const TEAM: Team = {
  id: 'team-1',
  idPrefix: 'dev',
  name: '開発部',
  color: 'blue',
  area: { x: 0, y: 0, w: 400, h: 200 },
}

describe('canDeleteGhost', () => {
  it('掴み直し中の対象があれば削除ボタンを出す', () => {
    expect(canDeleteGhost({ kind: 'facility', id: 'fac-1' })).toBe(true)
  })

  it('新規配置(掴み直しの対象が無い)では出さない', () => {
    expect(canDeleteGhost(null)).toBe(false)
  })
})

describe('isDeleteConfirmOpen', () => {
  it('どちらの確認も閉じていれば削除処理中ではない', () => {
    expect(isDeleteConfirmOpen(null, null)).toBe(false)
  })

  it('会議室の削除確認だけが開いていても削除処理中', () => {
    expect(isDeleteConfirmOpen(FACILITY, null)).toBe(true)
  })

  it('チームの削除確認だけが開いていても削除処理中', () => {
    expect(isDeleteConfirmOpen(null, TEAM)).toBe(true)
  })

  it('両方が開いていても削除処理中', () => {
    expect(isDeleteConfirmOpen(FACILITY, TEAM)).toBe(true)
  })
})
