import { describe, it, expect } from 'vitest'
import type { Employee } from '@/types'
import {
  normalizeDepartment,
  resolvePositionRank,
  resolveSortCode,
} from './sort-directory-employees'

const employee = (overrides: Partial<Employee>): Employee => ({
  id: 'e1',
  name: '社員',
  nameKana: 'シャイン',
  teamId: 't1',
  team: '営業部',
  ...overrides,
})

// 役職の上位から順に並べた表(仕様の写し。1件でも順番や文字がずれたら落ちる)
const POSITIONS_IN_RANK_ORDER = [
  '代表取締役会長',
  '取締役会長',
  '代表取締役社長',
  '取締役副社長執行役員',
  '取締役専務執行役員',
  '取締役常務執行役員',
  '取締役執行役員',
  '取締役相談役',
  '相談役',
  '取締役シニアフェロー',
  '監査役',
  '顧問',
  '執行役員本部長',
  '執行役員事業部長',
  '執行役員統括部長',
  '執行役員部長',
  '執行役員支店長',
  'スーパーバイザー',
  '本部長',
  '事業部長',
  '統括部長',
  '部長',
  '支店長',
  '室長',
  '次長',
  '課長',
  '所長',
  '課長代理（管理職）',
  '所長代理（管理職）',
  '課長代理（組合員）',
  '所長代理（組合員）',
  '参与',
  '係長',
  '主任',
  '副主任',
  'チームリーダー',
]

describe('normalizeDepartment', () => {
  it('前後の空白を落とした部署名を返す', () => {
    expect(normalizeDepartment(' 営業部 ')).toBe('営業部')
  })

  it('空文字・空白だけの部署名は「未所属」にまとめる', () => {
    expect(normalizeDepartment('')).toBe('未所属')
    expect(normalizeDepartment('  ')).toBe('未所属')
  })
})

describe('resolveSortCode', () => {
  it('ownerCode の数字の並びを数値で返す', () => {
    expect(resolveSortCode(employee({ ownerCode: '1234' }))).toBe(1234)
    expect(resolveSortCode(employee({ ownerCode: 'E0042' }))).toBe(42)
  })

  it('ownerCode があればメールより優先する', () => {
    expect(resolveSortCode(employee({ ownerCode: '1234', email: 'ab5678@example.co.jp' }))).toBe(
      1234
    )
  })

  it('ownerCode が無い・数字を含まない時はメールのローカル部から4桁以上の数字を取る', () => {
    expect(resolveSortCode(employee({ email: 'ab1234@example.co.jp' }))).toBe(1234)
    expect(resolveSortCode(employee({ ownerCode: 'ABC', email: 'ab12345@example.co.jp' }))).toBe(
      12345
    )
  })

  it('ローカル部の数字が3桁以下・ドメイン側にしか数字が無い時は null', () => {
    expect(resolveSortCode(employee({ email: 'ab123@example.co.jp' }))).toBeNull()
    expect(resolveSortCode(employee({ email: 'ab@example1234.co.jp' }))).toBeNull()
  })

  it('ownerCode もメールも無い時は null', () => {
    expect(resolveSortCode(employee({}))).toBeNull()
  })
})

describe('resolvePositionRank', () => {
  it('表の役職は上位から 0, 1, 2… の順位になる', () => {
    POSITIONS_IN_RANK_ORDER.forEach((position, index) => {
      expect(resolvePositionRank(employee({ position }))).toBe(index)
    })
  })

  it('前後の空白を落としてから表と突き合わせる', () => {
    expect(resolvePositionRank(employee({ position: ' 部長 ' }))).toBe(21)
  })

  it('表に無い役職は既知の役職の直後(表の件数)へ送る', () => {
    expect(resolvePositionRank(employee({ position: '名誉職' }))).toBe(36)
  })

  it('役職なしは最下位(表の件数 + 1)へ送る', () => {
    expect(resolvePositionRank(employee({}))).toBe(37)
    expect(resolvePositionRank(employee({ position: '' }))).toBe(37)
    expect(resolvePositionRank(employee({ position: '  ' }))).toBe(37)
  })
})
