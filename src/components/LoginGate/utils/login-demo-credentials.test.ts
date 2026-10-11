import { describe, it, expect } from 'vitest'
import { DEMO_LOGIN_ID, DEMO_PASSWORD } from './login-demo-credentials'

// 入力を変えずに送信できることが要件。use-login-gate.ts の canSubmit と同じ条件を初期値が満たすかを見る
describe('デモのログイン初期値', () => {
  it('ログインIDは前後の空白を除いても空ではない', () => {
    expect(DEMO_LOGIN_ID.trim().length).toBeGreaterThan(0)
  })

  it('パスワードは空ではない', () => {
    expect(DEMO_PASSWORD.length).toBeGreaterThan(0)
  })
})
