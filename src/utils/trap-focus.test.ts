// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { FOCUSABLE } from './trap-focus'

const matchedIds = (html: string) => {
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].map(el => el.id)
}

describe('FOCUSABLE', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('リンク・ボタン・入力欄・テキストエリア・セレクト・明示 tabindex を拾う', () => {
    expect(
      matchedIds(
        [
          '<a id="link" href="#">link</a>',
          '<button id="button">button</button>',
          '<input id="input" />',
          '<textarea id="textarea"></textarea>',
          '<select id="select"></select>',
          '<div id="tabbable" tabindex="0">tabbable</div>',
        ].join('')
      )
    ).toEqual(['link', 'button', 'input', 'textarea', 'select', 'tabbable'])
  })

  it('href の無いリンク・無効のボタンと入力欄・tabindex=-1・ただの要素は拾わない', () => {
    expect(
      matchedIds(
        [
          '<a id="anchor">anchor</a>',
          '<button id="disabled-button" disabled>button</button>',
          '<input id="disabled-input" disabled />',
          '<div id="skipped" tabindex="-1">skipped</div>',
          '<div id="plain">plain</div>',
        ].join('')
      )
    ).toEqual([])
  })
})
