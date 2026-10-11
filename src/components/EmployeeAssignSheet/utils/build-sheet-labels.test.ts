import { describe, it, expect } from 'vitest'
import type { Employee } from '@/types'
import { buildSeatNote, labelBulkDepartment } from './build-sheet-labels'

describe('buildSeatNote', () => {
  it('座っている社員がいれば名前を添えて着席中と伝える', () => {
    const occupant: Employee = {
      id: 'e1',
      name: '佐藤',
      nameKana: 'さとう',
      teamId: 't1',
      team: 'あ部',
    }
    expect(buildSeatNote(occupant)).toBe('現在は佐藤さんが着席しています')
  })

  it('誰も座っていなければ空席と伝える', () => {
    expect(buildSeatNote(null)).toBe('空席です')
  })
})

describe('labelBulkDepartment', () => {
  it('対象席のチームの部署名をそのまま出す', () => {
    expect(labelBulkDepartment('開発部')).toBe('開発部')
  })

  it('部署名が引けなければ総称を出す', () => {
    expect(labelBulkDepartment(null)).toBe('対象部署')
  })
})
