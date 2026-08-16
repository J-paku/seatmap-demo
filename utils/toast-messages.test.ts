import { describe, it, expect } from 'vitest'
import { TOAST_MESSAGES } from './toast-messages'

describe('TOAST_MESSAGES', () => {
  it('保存系メッセージが期待した文言を持つ', () => {
    expect(TOAST_MESSAGES.SAVE_SUCCESS).toBe('保存しました')
    expect(TOAST_MESSAGES.SAVE_OFFLINE).toBe('オフラインのため端末に一時保存しました')
    expect(TOAST_MESSAGES.SAVE_FAILED).toBe('保存に失敗しました')
  })

  it('権限・ネットワーク系メッセージが期待した文言を持つ', () => {
    expect(TOAST_MESSAGES.NETWORK_CHECK).toBe('ネットワーク接続を確認してください')
    expect(TOAST_MESSAGES.ADMIN_REQUIRED).toBe('編集には管理者権限が必要です')
    expect(TOAST_MESSAGES.CONFLICT_UPDATE).toBe('他の管理者が更新しました')
  })

  it('編集不可の2文言(オフライン理由/管理者権限理由)は別文言として独立して存在する', () => {
    expect(TOAST_MESSAGES.EDIT_DISABLED_OFFLINE).toBe('オフラインのため編集できません')
    expect(TOAST_MESSAGES.EDIT_DISABLED_ADMIN).toBe('管理者権限がないため編集できません')
    expect(TOAST_MESSAGES.EDIT_DISABLED_OFFLINE).not.toBe(TOAST_MESSAGES.EDIT_DISABLED_ADMIN)
    expect(TOAST_MESSAGES.EDIT_DISABLED_ADMIN).not.toBe(TOAST_MESSAGES.ADMIN_REQUIRED)
  })

  it('配属系メッセージは {name}・{seatId} 等のプレースホルダを含む', () => {
    expect(TOAST_MESSAGES.ASSIGN_SUCCESS).toContain('{name}')
    expect(TOAST_MESSAGES.ASSIGN_SUCCESS).toContain('{seatId}')
    expect(TOAST_MESSAGES.ASSIGN_REPLACE).toContain('{seatId}')
    expect(TOAST_MESSAGES.ASSIGN_REPLACE).toContain('{name}')
    expect(TOAST_MESSAGES.ASSIGN_MOVE).toContain('{name}')
    expect(TOAST_MESSAGES.ASSIGN_MOVE).toContain('{seatId}')
  })

  it('座席交換メッセージは2名分・2席分のプレースホルダを含む', () => {
    expect(TOAST_MESSAGES.ASSIGN_SWAP).toContain('{name1}')
    expect(TOAST_MESSAGES.ASSIGN_SWAP).toContain('{seat1}')
    expect(TOAST_MESSAGES.ASSIGN_SWAP).toContain('{name2}')
    expect(TOAST_MESSAGES.ASSIGN_SWAP).toContain('{seat2}')
  })

  it('重複配属解消メッセージは {name} プレースホルダを含む', () => {
    expect(TOAST_MESSAGES.ASSIGN_DEDUPED).toContain('{name}')
  })

  it('削除系メッセージは {name} を含むものと含まないものが区別される', () => {
    expect(TOAST_MESSAGES.DELETE_SUCCESS).toBe('削除しました')
    expect(TOAST_MESSAGES.DELETE_SUCCESS).not.toContain('{name}')
    expect(TOAST_MESSAGES.DELETE_TEAM_SUCCESS).toContain('{name}')
    expect(TOAST_MESSAGES.DELETE_FACILITY_SUCCESS).toContain('{name}')
  })

  it('APIエラー系メッセージが期待した文言を持つ', () => {
    expect(TOAST_MESSAGES.API_AUTH_ERROR).toBe('認証エラーが発生しました。ログイン状態を確認してください')
    expect(TOAST_MESSAGES.API_NETWORK_ERROR).toBe('通信エラーが発生しました。ネットワーク接続を確認してください')
  })

  it('アクション系メッセージが期待した文言を持つ', () => {
    expect(TOAST_MESSAGES.COPY_SUCCESS).toBe('コピーしました')
    expect(TOAST_MESSAGES.COPY_FAILED).toBe('コピーに失敗しました')
    expect(TOAST_MESSAGES.UNDO_ACTION).toBe('元に戻す')
    expect(TOAST_MESSAGES.UNDO_SUCCESS).toBe('元に戻しました')
  })

  it('as const だが Object.freeze はされておらず実行時には可変である', () => {
    expect(Object.isFrozen(TOAST_MESSAGES)).toBe(false)
  })
})
