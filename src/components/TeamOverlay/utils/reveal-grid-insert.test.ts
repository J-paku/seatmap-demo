import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { REVEAL_MS } from './reveal-grid-insert'

describe('REVEAL_MS', () => {
  it('CSS の gridInsertReveal のアニメーションと同じ長さで点灯を消す', () => {
    const css = readFileSync(new URL('../team-overlay-modal.module.css', import.meta.url), 'utf8')
    const duration = /animation:\s*gridInsertReveal\s+(\d+)ms/.exec(css)

    expect(duration?.[1]).toBe(String(REVEAL_MS))
  })
})
