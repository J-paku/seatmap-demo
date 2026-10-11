import { describe, expect, it } from 'vitest'
import { buildAssignConfirmContent, UNKNOWN_TEAM_NAME } from './assign-confirm-content'

describe('UNKNOWN_TEAM_NAME', () => {
  // 座席IDではなくチーム名相当の語で逃げる(§07-4 場所表記はチーム名)
  it('チーム名を引けなかった時は「別のチーム」と書く', () => {
    expect(UNKNOWN_TEAM_NAME).toBe('別のチーム')
  })
})

describe('buildAssignConfirmContent', () => {
  it('どこにも座っていない社員を空席へ入れる時は確認を出さない', () => {
    expect(
      buildAssignConfirmContent({
        employeeName: '山田',
        fromTeamName: null,
        toTeamName: '開発',
        occupantName: null,
        isSameTeam: false,
      })
    ).toBeNull()
  })

  it('どこにも座っていない社員を人の居る席へ入れる時は担当者の差し替えを確認する', () => {
    expect(
      buildAssignConfirmContent({
        employeeName: '山田',
        fromTeamName: null,
        toTeamName: '開発',
        occupantName: '佐藤',
        isSameTeam: false,
      })
    ).toEqual({
      title: '社員を変更しますか？',
      message: '開発の担当者を山田に変更しますか？',
      supplement: '現在の佐藤は解除されます',
      confirmLabel: '変更する',
    })
  })

  it('別のチームから空席へ移す時は移動先のチーム名を出し、元の席が空くと補う', () => {
    expect(
      buildAssignConfirmContent({
        employeeName: '山田',
        fromTeamName: '営業',
        toTeamName: '開発',
        occupantName: null,
        isSameTeam: false,
      })
    ).toEqual({
      title: '社員の席を移動しますか？',
      message: '山田は現在、営業に配属されています。開発へ移動しますか？',
      supplement: '営業の元の席は空席になります',
      confirmLabel: '移動する',
    })
  })

  it('同じチームの中で人の居る席へ移す時は同じチーム内の移動と書き、居た人が元の席へ移ると補う', () => {
    expect(
      buildAssignConfirmContent({
        employeeName: '山田',
        fromTeamName: '開発',
        toTeamName: '開発',
        occupantName: '佐藤',
        isSameTeam: true,
      })
    ).toEqual({
      title: '社員の席を移動しますか？',
      message: '山田は現在、開発に配属されています。同じ開発内で席を移動しますか？',
      supplement: '現在の佐藤は開発へ移動します',
      confirmLabel: '移動する',
    })
  })
})
