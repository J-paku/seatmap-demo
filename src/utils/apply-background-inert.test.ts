// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 参照カウントと退避した値はモジュールの中の変数なので、テストごとに読み込み直して数を 0 から始める
const load = async () => {
  vi.resetModules()
  return import('./apply-background-inert')
}

const makeRoot = () => {
  const root = document.createElement('div')
  root.innerHTML = [
    '<a id="link" href="#">link</a>',
    '<a id="anchor">anchor</a>',
    '<button id="button">button</button>',
    '<input id="input" />',
    '<textarea id="textarea"></textarea>',
    '<select id="select"></select>',
    '<div id="tabbable" tabindex="0">tabbable</div>',
    '<div id="positive" tabindex="2">positive</div>',
    '<div id="plain">plain</div>',
  ].join('')
  document.body.appendChild(root)
  return root
}

const tabindexOf = (root: HTMLElement, id: string) =>
  root.querySelector(`#${id}`)?.getAttribute('tabindex')

describe('applyBackgroundInert / releaseBackgroundInert', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('無効化すると aria-hidden と pointer-events を立てる', async () => {
    const { applyBackgroundInert } = await load()
    const root = makeRoot()
    root.style.pointerEvents = 'auto'
    applyBackgroundInert(root)
    expect(root.getAttribute('aria-hidden')).toBe('true')
    expect(root.style.pointerEvents).toBe('none')
  })

  it('無効化するとフォーカスできる要素だけ tabindex を -1 にする', async () => {
    const { applyBackgroundInert } = await load()
    const root = makeRoot()
    applyBackgroundInert(root)
    for (const id of ['link', 'button', 'input', 'textarea', 'select', 'tabbable', 'positive']) {
      expect(tabindexOf(root, id)).toBe('-1')
    }
    expect(tabindexOf(root, 'anchor')).toBeNull()
    expect(tabindexOf(root, 'plain')).toBeNull()
  })

  it('戻すと aria-hidden・pointer-events・tabindex を無効化の前へ戻す', async () => {
    const { applyBackgroundInert, releaseBackgroundInert } = await load()
    const root = makeRoot()
    root.style.pointerEvents = 'auto'
    applyBackgroundInert(root)
    releaseBackgroundInert(root)
    expect(root.hasAttribute('aria-hidden')).toBe(false)
    expect(root.style.pointerEvents).toBe('auto')
    for (const id of ['link', 'button', 'input', 'textarea', 'select', 'anchor', 'plain']) {
      expect(tabindexOf(root, id)).toBeNull()
    }
    expect(tabindexOf(root, 'tabbable')).toBe('0')
    expect(tabindexOf(root, 'positive')).toBe('2')
  })

  it('もともと付いていた aria-hidden の値へ戻す', async () => {
    const { applyBackgroundInert, releaseBackgroundInert } = await load()
    const root = makeRoot()
    root.setAttribute('aria-hidden', 'false')
    applyBackgroundInert(root)
    expect(root.getAttribute('aria-hidden')).toBe('true')
    releaseBackgroundInert(root)
    expect(root.getAttribute('aria-hidden')).toBe('false')
  })

  it('入れ子では最後の1回を戻すまで無効のまま保つ', async () => {
    const { applyBackgroundInert, releaseBackgroundInert } = await load()
    const root = makeRoot()
    root.style.pointerEvents = 'auto'
    applyBackgroundInert(root)
    applyBackgroundInert(root)
    releaseBackgroundInert(root)
    expect(root.getAttribute('aria-hidden')).toBe('true')
    expect(root.style.pointerEvents).toBe('none')
    expect(tabindexOf(root, 'button')).toBe('-1')
    releaseBackgroundInert(root)
    expect(root.hasAttribute('aria-hidden')).toBe(false)
    expect(root.style.pointerEvents).toBe('auto')
    expect(tabindexOf(root, 'button')).toBeNull()
  })

  it('入れ子の2回目では退避し直さず、最初の状態へ戻す', async () => {
    const { applyBackgroundInert, releaseBackgroundInert } = await load()
    const root = makeRoot()
    root.style.pointerEvents = 'auto'
    applyBackgroundInert(root)
    // 無効化した状態を2回目が退避し直すと、戻した後も無効のまま残る
    applyBackgroundInert(root)
    releaseBackgroundInert(root)
    releaseBackgroundInert(root)
    expect(root.hasAttribute('aria-hidden')).toBe(false)
    expect(root.style.pointerEvents).toBe('auto')
    expect(tabindexOf(root, 'tabbable')).toBe('0')
  })

  it('戻した後の2周目は、1周目に退避した要素へ触らない', async () => {
    const { applyBackgroundInert, releaseBackgroundInert } = await load()
    const root = makeRoot()
    const button = root.querySelector<HTMLElement>('#button')
    applyBackgroundInert(root)
    releaseBackgroundInert(root)
    // 1周目の退避が残っていると、root から外した button の tabindex を2周目が消してしまう
    button?.remove()
    button?.setAttribute('tabindex', '3')
    applyBackgroundInert(root)
    releaseBackgroundInert(root)
    expect(button?.getAttribute('tabindex')).toBe('3')
  })

  it('無効化していないのに戻しても何も変えない', async () => {
    const { releaseBackgroundInert } = await load()
    const root = makeRoot()
    root.style.pointerEvents = 'auto'
    root.setAttribute('aria-hidden', 'false')
    releaseBackgroundInert(root)
    expect(root.getAttribute('aria-hidden')).toBe('false')
    expect(root.style.pointerEvents).toBe('auto')
    expect(tabindexOf(root, 'tabbable')).toBe('0')
  })
})
