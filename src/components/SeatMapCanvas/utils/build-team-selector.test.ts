import { describe, it, expect } from 'vitest'
import { buildTeamSelector } from './build-team-selector'

describe('buildTeamSelector', () => {
  it('data-team-id が idPrefix に一致する要素を指す', () => {
    expect(buildTeamSelector('DEV')).toBe('[data-team-id="DEV"]')
  })
})
