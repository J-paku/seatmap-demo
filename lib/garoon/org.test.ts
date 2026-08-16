// lib/garoon/org.ts は境界を記述する「型のみ」のファイル(実行時コードを一切持たない)。
// 実装本体を変更する権限は無いため、ここではコメントに書かれた契約
// (mocks/teams.json の idPrefix が id に対応する想定)を実データで検証する
import { describe, it, expect } from 'vitest'
import teamsJson from '../../mocks/teams.json'
import teamsFloor2Json from '../../mocks/floor-2/teams.json'

describe('mocks/teams.json との契約(コメント記載の対応関係)', () => {
  it('全チームの idPrefix は非空文字列(GaroonOrganizationUnit.id 対応の想定を満たす)', () => {
    const allTeams = [...teamsJson, ...teamsFloor2Json]
    expect(allTeams.length).toBeGreaterThan(0)
    allTeams.forEach((team) => {
      expect(typeof team.idPrefix).toBe('string')
      expect(team.idPrefix.length).toBeGreaterThan(0)
    })
  })

  it('idPrefix は floor-1 と floor-2 を通して重複しない(組織IDとして一意という想定)', () => {
    const allTeams = [...teamsJson, ...teamsFloor2Json]
    const prefixes = allTeams.map((team) => team.idPrefix)
    expect(new Set(prefixes).size).toBe(prefixes.length)
  })
})
