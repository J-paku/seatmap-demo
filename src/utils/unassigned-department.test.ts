import { describe, it, expect } from 'vitest'
import { UNASSIGNED_DEPARTMENT, normalizeDepartment } from './unassigned-department'

describe('UNASSIGNED_DEPARTMENT', () => {
  it('所属部署が空の社員は「未所属」にまとめる', () => {
    expect(UNASSIGNED_DEPARTMENT).toBe('未所属')
  })
})

describe('normalizeDepartment', () => {
  it('前後の空白を落とした部署名を返す', () => {
    expect(normalizeDepartment(' 営業部 ')).toBe('営業部')
  })

  it('空文字・空白だけの部署名は「未所属」にまとめる', () => {
    expect(normalizeDepartment('')).toBe('未所属')
    expect(normalizeDepartment('  ')).toBe('未所属')
  })
})
