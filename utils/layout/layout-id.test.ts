import { describe, it, expect, vi, afterEach } from 'vitest'
import { createLayoutId, createEmptyLayout } from './layout-id'
import { VIEWBOX_H, VIEWBOX_W } from './geometry'
import type { LayoutMeta } from '@/types'

// globalThis.crypto は getter 専用プロパティで直接代入できないため、vi.stubGlobal で差し替える
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createLayoutId', () => {
  it('crypto.randomUUID が使える環境では UUID 形式の文字列を返す', () => {
    const id = createLayoutId([])
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('crypto.randomUUID が無い環境では layout-1 から始まるフォールバックを返す', () => {
    vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: undefined })
    const id = createLayoutId([])
    expect(id).toBe('layout-1')
  })

  it('crypto 自体が undefined でもフォールバックする', () => {
    vi.stubGlobal('crypto', undefined)
    const id = createLayoutId([])
    expect(id).toBe('layout-1')
  })

  it('フォールバック時、既存メタの最大連番+1を採番する', () => {
    vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: undefined })
    const existing: LayoutMeta[] = [
      { layoutId: 'layout-3', layoutName: 'A', updatedAt: '2026-01-01' },
      { layoutId: 'layout-7', layoutName: 'B', updatedAt: '2026-01-02' },
      { layoutId: 'layout-1', layoutName: 'C', updatedAt: '2026-01-03' },
    ]
    const id = createLayoutId(existing)
    expect(id).toBe('layout-8')
  })

  it('フォールバック時、形式外のidは連番採番の対象から外れる(0扱い)', () => {
    vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: undefined })
    const existing: LayoutMeta[] = [
      { layoutId: 'custom-abc', layoutName: 'A', updatedAt: '2026-01-01' },
      { layoutId: 'not-matching', layoutName: 'B', updatedAt: '2026-01-02' },
    ]
    const id = createLayoutId(existing)
    expect(id).toBe('layout-1')
  })
})

describe('createEmptyLayout', () => {
  it('空配列の座席・チーム・会議室・家具を持つ雛形を作る', () => {
    const layout = createEmptyLayout('layout-1', 'New Floor')
    expect(layout.floorId).toBe('layout-1')
    expect(layout.floorName).toBe('New Floor')
    expect(layout.seats).toEqual([])
    expect(layout.teams).toEqual([])
    expect(layout.facilities).toEqual([])
    expect(layout.furniture).toEqual([])
  })

  it('viewBox は geometry の定数と一致する', () => {
    const layout = createEmptyLayout('layout-2', 'Floor 2')
    expect(layout.viewBox).toEqual({ width: VIEWBOX_W, height: VIEWBOX_H })
  })
})
