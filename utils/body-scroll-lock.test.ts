// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { lockBodyScroll, unlockBodyScroll } from './body-scroll-lock'

// lockCount / originalOverflow はモジュール内のクロージャ変数で公開 API から直接リセットできない。
// 十分な回数 unlock してカウンタを 0 まで落とし切ってから overflow を初期化し、各テストを独立させる
const resetLockState = () => {
  for (let i = 0; i < 10; i++) unlockBodyScroll()
  document.body.style.overflow = ''
}

describe('lockBodyScroll / unlockBodyScroll', () => {
  beforeEach(() => {
    resetLockState()
  })

  it('ロックすると body の overflow が hidden になる', () => {
    document.body.style.overflow = 'auto'
    lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('アンロックするとロック前の overflow 値に戻る', () => {
    document.body.style.overflow = 'auto'
    lockBodyScroll()
    unlockBodyScroll()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('ロック前の overflow が空文字でもアンロック後に空文字へ戻す', () => {
    document.body.style.overflow = ''
    lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
    unlockBodyScroll()
    expect(document.body.style.overflow).toBe('')
  })

  it('2回ロックしても1回のアンロックでは hidden のまま維持される(参照カウント)', () => {
    document.body.style.overflow = 'scroll'
    lockBodyScroll()
    lockBodyScroll()
    unlockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('ロック回数と同じ回数だけアンロックすると元の値に戻る', () => {
    document.body.style.overflow = 'scroll'
    lockBodyScroll()
    lockBodyScroll()
    unlockBodyScroll()
    unlockBodyScroll()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('ネスト中に外部から overflow が書き換わっても、最初にロックした時点の値だけを最終的な復元先として保持する', () => {
    document.body.style.overflow = 'initial-value'
    lockBodyScroll() // count=1, originalOverflow='initial-value' をキャプチャし overflow='hidden'
    document.body.style.overflow = 'mutated-by-something-else' // ロック中に外部が書き換えたと仮定
    lockBodyScroll() // count=2, 既にロック中なので再キャプチャしない
    lockBodyScroll() // count=3
    unlockBodyScroll() // count=2, まだロック中なので復元しない
    unlockBodyScroll() // count=1, まだロック中なので復元しない
    expect(document.body.style.overflow).toBe('mutated-by-something-else')
    unlockBodyScroll() // count=0, 最初にキャプチャした値へ復元する
    expect(document.body.style.overflow).toBe('initial-value')
  })

  it('ロックしていない状態でアンロックしても例外を投げず overflow は変化しない', () => {
    document.body.style.overflow = 'visible'
    expect(() => unlockBodyScroll()).not.toThrow()
    expect(document.body.style.overflow).toBe('visible')
  })
})
