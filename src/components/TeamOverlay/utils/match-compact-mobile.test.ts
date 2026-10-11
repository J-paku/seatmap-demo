import { describe, expect, it } from 'vitest'
import { COMPACT_MOBILE_QUERY } from './match-compact-mobile'

describe('COMPACT_MOBILE_QUERY', () => {
  it('幅 760px 以下をモバイル表示とみなす幅だけのクエリ', () => {
    expect(COMPACT_MOBILE_QUERY).toBe('(max-width: 760px)')
  })
})
