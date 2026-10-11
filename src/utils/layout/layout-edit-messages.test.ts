import { describe, it, expect } from 'vitest'
import { MSG_FACILITY, MSG_OVERLAP, MSG_SAVING } from './layout-edit-messages'

describe('レイアウト編集のエラー文言', () => {
  it('設備との重なりを拒む文言', () => {
    expect(MSG_FACILITY).toBe('設備と重なるため配置できません')
  })

  it('置けない場所を拒む文言', () => {
    expect(MSG_OVERLAP).toBe('ここには配置できません')
  })

  it('保存中の操作を拒む文言', () => {
    expect(MSG_SAVING).toBe('保存中は操作できません')
  })

  it('3つの文言はすべて別の文言', () => {
    expect(new Set([MSG_FACILITY, MSG_OVERLAP, MSG_SAVING]).size).toBe(3)
  })
})
