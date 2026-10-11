import { afterEach, describe, expect, it, vi } from 'vitest'
import { writeClipboardText } from './copy-field-clipboard'

describe('writeClipboardText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('navigator が無い環境では書かずに null を返す', () => {
    vi.stubGlobal('navigator', undefined)

    expect(writeClipboardText('090-1234-5678')).toBeNull()
  })

  it('クリップボードを持たない navigator では null を返す', () => {
    vi.stubGlobal('navigator', {})

    expect(writeClipboardText('090-1234-5678')).toBeNull()
  })

  it('クリップボードがあれば文字列を書き、その Promise をそのまま返す', () => {
    const written = Promise.resolve()
    const writeText = vi.fn(() => written)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    expect(writeClipboardText('090-1234-5678')).toBe(written)
    expect(writeText).toHaveBeenCalledWith('090-1234-5678')
  })
})
