import { describe, it, expect } from 'vitest'
import { resolveAvatarImportErrorMessage } from './avatar-import-messages'
import type { AvatarImportError } from '@/utils/avatar/avatar-import-parser'

// 失敗理由の全種。Record で書くので、種類の足し忘れ・書き違いは型エラーになる
const ERROR_KIND_SET: Record<AvatarImportError, true> = {
  invalidJson: true,
  invalidKind: true,
  invalidHair: true,
  invalidFace: true,
  invalidAccessory: true,
  invalidOutfit: true,
  invalidPalette: true,
  pixelsInvalidSize: true,
  pixelsInvalidRows: true,
  pixelsInvalidPalette: true,
}
const ERROR_KINDS = Object.keys(ERROR_KIND_SET) as AvatarImportError[]

describe('resolveAvatarImportErrorMessage', () => {
  it('成功・未試行 (null) なら文言を出さない', () => {
    expect(resolveAvatarImportErrorMessage(null)).toBeNull()
  })

  it.each(ERROR_KINDS)('%s は「何が駄目か」と「次にどうするか」の2行の文言になる', error => {
    const lines = (resolveAvatarImportErrorMessage(error) ?? '').split('\n')
    expect(lines).toHaveLength(2)
    expect(lines.every(line => line.trim().length > 0)).toBe(true)
  })

  it('理由が違えば文言も違い、利用者はどこが駄目だったかを見分けられる', () => {
    const messages = ERROR_KINDS.map(resolveAvatarImportErrorMessage)
    expect(new Set(messages).size).toBe(ERROR_KINDS.length)
  })

  it('色の失敗では、取り込み口が受け付ける6桁のカラーコードを例に示す', () => {
    for (const error of ['invalidPalette', 'pixelsInvalidPalette'] as const) {
      expect(resolveAvatarImportErrorMessage(error)).toMatch(/#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/)
    }
  })
})
