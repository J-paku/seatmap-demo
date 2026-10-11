import { describe, it, expect } from 'vitest'
import { UNDO_STACK_LIMIT } from './edit-undo-limit'

describe('UNDO_STACK_LIMIT', () => {
  it('編集セッションの undo は直近10件まで持つ', () => {
    expect(UNDO_STACK_LIMIT).toBe(10)
  })
})
