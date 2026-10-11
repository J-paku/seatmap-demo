import { describe, it, expect } from 'vitest'
import { nameOf } from './resolve-assignee-name'
import type { Employee } from '@/types'

const employeeOf = (id: string, name: string): Employee => ({
  id,
  name,
  nameKana: '',
  teamId: 'team-1',
  team: '開発部',
})

const employeeById = new Map([['e1', employeeOf('e1', '開発部1')]])

describe('nameOf', () => {
  it('名簿に居る社員は氏名を返す', () => {
    expect(nameOf(employeeById, 'e1')).toBe('開発部1')
  })

  it('名簿に居ない id は「担当者」と読む', () => {
    expect(nameOf(employeeById, 'e9')).toBe('担当者')
  })

  it('id が null・undefined(空席・未指定)なら「担当者」と読む', () => {
    expect(nameOf(employeeById, null)).toBe('担当者')
    expect(nameOf(employeeById, undefined)).toBe('担当者')
  })

  it('空文字の id は名簿を引かずに「担当者」と読む', () => {
    const withEmptyKey = new Map([['', employeeOf('', '空文字の社員')]])
    expect(nameOf(withEmptyKey, '')).toBe('担当者')
  })
})
