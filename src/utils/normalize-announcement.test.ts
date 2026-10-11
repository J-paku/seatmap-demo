import { describe, it, expect } from 'vitest'
import { TOAST_HIDE_DELAY, normalizeAnnouncement } from './normalize-announcement'

describe('TOAST_HIDE_DELAY', () => {
  it('トーストを出しておく時間は 2600ms', () => {
    expect(TOAST_HIDE_DELAY).toBe(2600)
  })
})

describe('normalizeAnnouncement', () => {
  it('空文字は空のまま info にする', () => {
    expect(normalizeAnnouncement('')).toEqual({ message: '', tone: 'info' })
  })

  it('空白だけの文言は空にして info にする', () => {
    expect(normalizeAnnouncement('  \n ')).toEqual({ message: '', tone: 'info' })
  })

  it('前後の空白を落とす', () => {
    expect(normalizeAnnouncement('  こんにちは  ')).toEqual({ message: 'こんにちは', tone: 'info' })
  })

  it.each([
    ['[success] 保存', 'success'],
    ['[warning] 保存', 'warning'],
    ['[error] 保存', 'error'],
    ['[info] 保存', 'info'],
  ])('頭のタグ %s から色味 %s を取り、タグを外す', (raw, tone) => {
    expect(normalizeAnnouncement(raw)).toEqual({ message: '保存', tone })
  })

  it('タグの大文字小文字を問わず、色味は小文字にそろえる', () => {
    expect(normalizeAnnouncement('[SUCCESS] 保存')).toEqual({ message: '保存', tone: 'success' })
    expect(normalizeAnnouncement('[Warning] 保存')).toEqual({ message: '保存', tone: 'warning' })
  })

  it('タグの直後に空白が無くてもタグを外す', () => {
    expect(normalizeAnnouncement('[success]保存')).toEqual({ message: '保存', tone: 'success' })
  })

  it('タグの直後の空白は何個でもまとめて外す', () => {
    expect(normalizeAnnouncement('[error]   保存')).toEqual({ message: '保存', tone: 'error' })
  })

  it('タグの後ろの語の中の空白は残す', () => {
    expect(normalizeAnnouncement('[success] 保存 しました')).toEqual({
      message: '保存 しました',
      tone: 'success',
    })
  })

  it('タグはキーワードより先に効く', () => {
    expect(normalizeAnnouncement('[success] 失敗')).toEqual({ message: '失敗', tone: 'success' })
  })

  it('頭に無いタグはタグとして扱わない', () => {
    expect(normalizeAnnouncement('保存 [success] 完了')).toEqual({
      message: '保存 [success] 完了',
      tone: 'info',
    })
  })

  it('知らないタグはタグとして扱わない', () => {
    expect(normalizeAnnouncement('[notice] 保存')).toEqual({
      message: '[notice] 保存',
      tone: 'info',
    })
  })

  it('括弧の閉じないタグはタグとして扱わない', () => {
    expect(normalizeAnnouncement('[success 保存')).toEqual({
      message: '[success 保存',
      tone: 'info',
    })
  })

  it.each([
    'できません',
    '失敗',
    'エラー',
    '重な',
    '狭すぎ',
    'オフライン',
    '権限がない',
    '確認してください',
    'エリア外',
  ])('「%s」を含む文言は error にする', keyword => {
    const raw = `前${keyword}後`
    expect(normalizeAnnouncement(raw)).toEqual({ message: raw, tone: 'error' })
  })

  it.each(['選択してください', 'ありません', '解除しました'])(
    '「%s」を含む文言は warning にする',
    keyword => {
      const raw = `前${keyword}後`
      expect(normalizeAnnouncement(raw)).toEqual({ message: raw, tone: 'warning' })
    }
  )

  it.each([
    '追加しました',
    '削除しました',
    '変更しました',
    '入れ替えました',
    '挿入しました',
    '移動しました',
    '選択しました',
  ])('「%s」を含む文言は success にする', keyword => {
    const raw = `前${keyword}後`
    expect(normalizeAnnouncement(raw)).toEqual({ message: raw, tone: 'success' })
  })

  it('error のキーワードは warning・success より先に効く', () => {
    expect(normalizeAnnouncement('追加しましたが失敗')).toEqual({
      message: '追加しましたが失敗',
      tone: 'error',
    })
    expect(normalizeAnnouncement('ありません。エラー')).toEqual({
      message: 'ありません。エラー',
      tone: 'error',
    })
  })

  it('warning のキーワードは success より先に効く', () => {
    expect(normalizeAnnouncement('移動しましたが解除しました')).toEqual({
      message: '移動しましたが解除しました',
      tone: 'warning',
    })
  })

  it('どのキーワードも含まない文言は info にする', () => {
    expect(normalizeAnnouncement('保存')).toEqual({ message: '保存', tone: 'info' })
  })
})
