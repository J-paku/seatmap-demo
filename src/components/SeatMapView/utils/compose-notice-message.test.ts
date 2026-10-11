import { describe, it, expect } from 'vitest'
import { facilityDeletedMessage, focusFailureMessage } from './compose-notice-message'

describe('focusFailureMessage', () => {
  it('席を決められなかったときは「座席未設定」', () => {
    expect(focusFailureMessage('no-seat')).toBe('座席未設定')
  })

  it('席はあるがチーム箱を測れなかったときは所属チーム不明と伝える', () => {
    expect(focusFailureMessage('no-team')).toBe('座席の所属チームが不明です')
  })
})

describe('facilityDeletedMessage', () => {
  it('削除した会議室の名前をかぎ括弧で包んで伝える', () => {
    expect(facilityDeletedMessage('会議室A')).toBe('「会議室A」を削除しました')
  })
})
