import { describe, it, expect } from 'vitest'
import { hashStringToInt, hashString } from '@/utils/hash-string'

describe('hashStringToInt', () => {
  it('returns 0 for an empty string', () => {
    expect(hashStringToInt('')).toBe(0)
  })

  it('is deterministic for the same input', () => {
    expect(hashStringToInt('emp-001')).toBe(hashStringToInt('emp-001'))
  })

  it('differs for adjacent inputs (no trivial collision)', () => {
    expect(hashStringToInt('emp-001')).not.toBe(hashStringToInt('emp-002'))
  })

  it('matches the single-character computation (charCode only, no multiplier)', () => {
    expect(hashStringToInt('a')).toBe(97)
  })

  it('wraps to a signed 32-bit integer via the |0 coercion', () => {
    expect(hashStringToInt('emp-001')).toBe(-1626008660)
  })

  it('stays within the signed 32-bit range for long inputs', () => {
    const long = 'x'.repeat(50)
    const result = hashStringToInt(long)
    expect(Number.isInteger(result)).toBe(true)
    expect(result).toBeGreaterThanOrEqual(-2147483648)
    expect(result).toBeLessThanOrEqual(2147483647)
    expect(result).toBe(237795072)
  })
})

describe('hashString', () => {
  it('renders 0 as "0"', () => {
    expect(hashString('')).toBe('0')
  })

  it('renders a positive hash in base 36', () => {
    expect(hashString('a')).toBe('2p')
  })

  it('renders a negative hash with a leading "-" in base 36', () => {
    expect(hashString('emp-001')).toBe('-qw30b8')
  })

  it('is consistent with hashStringToInt().toString(36)', () => {
    expect(hashString('emp-002')).toBe(hashStringToInt('emp-002').toString(36))
  })
})
