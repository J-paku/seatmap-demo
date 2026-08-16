import { describe, it, expect } from 'vitest'
import type { Employee } from '@/types'
import { normalizeSearchText, matchesEmployeeQuery } from '@/utils/employee-search'

describe('normalizeSearchText', () => {
  it('converts hiragana to katakana', () => {
    expect(normalizeSearchText('たなか')).toBe('タナカ')
  })

  it('leaves already-katakana text unchanged (aside from NFKC/case)', () => {
    expect(normalizeSearchText('タナカ')).toBe('タナカ')
  })

  it('folds full-width alphanumerics to half-width and lowercases via NFKC', () => {
    expect(normalizeSearchText('Ａ１')).toBe('a1')
  })

  it('folds half-width katakana to full-width via NFKC', () => {
    expect(normalizeSearchText('ﾀﾅｶ')).toBe('タナカ')
  })

  it('lowercases latin letters', () => {
    expect(normalizeSearchText('ABC')).toBe('abc')
  })

  it('strips half-width and full-width (ideographic) whitespace', () => {
    expect(normalizeSearchText('a b　c')).toBe('abc')
  })

  it('combines hiragana-to-katakana with whitespace stripping', () => {
    expect(normalizeSearchText('やまだ たろう')).toBe('ヤマダタロウ')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeSearchText('')).toBe('')
  })
})

const baseEmployee: Employee = {
  id: 'e1',
  name: '山田太郎',
  nameKana: 'ヤマダタロウ',
  teamId: 't1',
  team: '営業部',
  ownerCode: '0001',
  furiganaSei: 'ヤマダ',
  furiganaMei: 'タロウ',
}

describe('matchesEmployeeQuery', () => {
  it('matches everything when the query is empty', () => {
    expect(matchesEmployeeQuery(baseEmployee, '')).toBe(true)
  })

  it('matches everything when the query is only whitespace', () => {
    expect(matchesEmployeeQuery(baseEmployee, '   ')).toBe(true)
  })

  it('matches a hiragana query against a katakana nameKana field', () => {
    expect(matchesEmployeeQuery(baseEmployee, 'やまだ')).toBe(true)
  })

  it('matches a partial substring of the team name', () => {
    expect(matchesEmployeeQuery(baseEmployee, '営業')).toBe(true)
  })

  it('matches the owner code exactly', () => {
    expect(matchesEmployeeQuery(baseEmployee, '0001')).toBe(true)
  })

  it('matches furiganaSei', () => {
    expect(matchesEmployeeQuery(baseEmployee, 'ヤマダ')).toBe(true)
  })

  it('does not match a query absent from every field', () => {
    expect(matchesEmployeeQuery(baseEmployee, 'zzz')).toBe(false)
  })

  it('is case-insensitive for latin queries against kana-normalized fields', () => {
    const employee: Employee = { ...baseEmployee, ownerCode: 'ABCD' }
    expect(matchesEmployeeQuery(employee, 'abcd')).toBe(true)
  })

  it('skips optional fields that are absent (no crash, no false match)', () => {
    const minimal: Employee = {
      id: 'e2',
      name: '鈴木花子',
      nameKana: 'スズキハナコ',
      teamId: 't2',
      team: '開発部',
    }
    expect(matchesEmployeeQuery(minimal, '0001')).toBe(false)
    expect(matchesEmployeeQuery(minimal, '鈴木')).toBe(true)
  })
})
