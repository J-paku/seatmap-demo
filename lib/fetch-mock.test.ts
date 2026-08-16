import { describe, it, expect, vi } from 'vitest'
import { fetchMock } from './fetch-mock'

describe('fetchMock', () => {
  it('渡したデータをそのまま解決する', async () => {
    const data = { id: 'emp-001', name: 'テスト太郎' }
    await expect(fetchMock(data)).resolves.toEqual(data)
  })

  it('プリミティブ値もそのまま解決する', async () => {
    await expect(fetchMock(42)).resolves.toBe(42)
    await expect(fetchMock(null)).resolves.toBeNull()
  })

  it('既定の遅延は200ms(第2引数省略時)', () => {
    vi.useFakeTimers()
    const onResolve = vi.fn()
    fetchMock('x').then(onResolve)

    vi.advanceTimersByTime(199)
    expect(onResolve).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    return Promise.resolve().then(() => {
      expect(onResolve).toHaveBeenCalledWith('x')
      vi.useRealTimers()
    })
  })

  it('delayMs を指定するとその時間だけ待って解決する', () => {
    vi.useFakeTimers()
    const onResolve = vi.fn()
    fetchMock('y', 1000).then(onResolve)

    vi.advanceTimersByTime(999)
    expect(onResolve).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    return Promise.resolve().then(() => {
      expect(onResolve).toHaveBeenCalledWith('y')
      vi.useRealTimers()
    })
  })

  it('delayMs=0 なら次のタイマー実行で即解決する', async () => {
    vi.useFakeTimers()
    const promise = fetchMock('z', 0)
    vi.advanceTimersByTime(0)
    await expect(promise).resolves.toBe('z')
    vi.useRealTimers()
  })
})
