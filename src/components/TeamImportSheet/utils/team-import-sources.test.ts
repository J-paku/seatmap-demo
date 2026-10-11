import { describe, it, expect } from 'vitest'
import { OFFICIAL_TEAM_IMPORT_SOURCES } from './team-import-sources'
import { ALL_TEAMS, FLOOR_SEEDS } from '@/lib/mock-loader'
import { FLOORS } from '@/utils/floors'

const allSeedSeatIds = FLOORS.flatMap(floor => FLOOR_SEEDS[floor.floorId].seats)
  .map(seat => seat.id)
  .sort()

describe('OFFICIAL_TEAM_IMPORT_SOURCES', () => {
  it('公式マスタの全チームを、フロア順・種データの並びのまま1件ずつ並べる', () => {
    expect(OFFICIAL_TEAM_IMPORT_SOURCES.map(source => source.team)).toEqual(ALL_TEAMS)
  })

  it('各チームには seat.teamId がそのチームを指す座席だけが付く', () => {
    for (const { team, seats } of OFFICIAL_TEAM_IMPORT_SOURCES) {
      expect(seats.every(seat => seat.teamId === team.id)).toBe(true)
    }
  })

  it('種データの座席は取りこぼしも重複もなく、どれか1チームに付く', () => {
    const seatIds = OFFICIAL_TEAM_IMPORT_SOURCES.flatMap(source => source.seats)
      .map(seat => seat.id)
      .sort()
    expect(seatIds).toEqual(allSeedSeatIds)
  })
})
