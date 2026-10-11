// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { COMMIT_SLOP, SNAP_TRANSITION, driveTransform, releaseTransform } from './dismiss-sheet'

// 前の追従が残っているシート要素を作る
const makeSheet = () => {
  const node = document.createElement('div')
  node.style.transition = 'opacity 1s'
  node.style.transform = 'translateY(40px)'
  return node
}

describe('スワイプで閉じるシートの定数', () => {
  it('確定前の遊び幅は 10px', () => {
    expect(COMMIT_SLOP).toBe(10)
  })

  it('元位置へ戻す transition は 0.2s の ease-out', () => {
    expect(SNAP_TRANSITION).toBe('transform 0.2s ease-out')
  })
})

describe('driveTransform', () => {
  it('シート要素が無ければ何もしない', () => {
    expect(() => driveTransform(null, 'translateY(10px)', true)).not.toThrow()
  })

  it('追従中は transition を残したまま transform だけ書き換える', () => {
    const node = makeSheet()
    driveTransform(node, 'translateY(10px)', false)
    expect(node.style.transform).toBe('translateY(10px)')
    expect(node.style.transition).toBe('opacity 1s')
  })

  it('instant のときは transition を切ってから transform を書き換える', () => {
    const node = makeSheet()
    driveTransform(node, 'translateY(10px)', true)
    expect(node.style.transform).toBe('translateY(10px)')
    expect(node.style.transition).toBe('none')
  })
})

describe('releaseTransform', () => {
  it('シート要素が無ければ何もしない', () => {
    expect(() => releaseTransform(null)).not.toThrow()
  })

  it('戻しの transition を付けて transform を外す', () => {
    const node = makeSheet()
    releaseTransform(node)
    expect(node.style.transition).toBe('transform 0.2s ease-out')
    expect(node.style.transform).toBe('')
  })
})
