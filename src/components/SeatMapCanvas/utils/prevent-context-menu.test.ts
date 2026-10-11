import { describe, it, expect, vi } from 'vitest'
import { preventContextMenu } from './prevent-context-menu'

describe('preventContextMenu', () => {
  it('ブラウザ既定のメニューを止める', () => {
    const preventDefault = vi.fn()
    preventContextMenu({ preventDefault })
    expect(preventDefault).toHaveBeenCalledTimes(1)
  })
})
