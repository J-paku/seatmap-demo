// @vitest-environment happy-dom
import { afterEach, describe, it, expect } from 'vitest'
import { MENU_ITEM_SELECTOR } from './add-fab-constants'

afterEach(() => {
  document.body.replaceChildren()
})

// role を持つ子要素を並べたメニューを作る
const menuOf = (roles: string[]) => {
  const menu = document.createElement('div')
  menu.setAttribute('role', 'menu')
  roles.forEach((role, index) => {
    const item = document.createElement('button')
    item.setAttribute('role', role)
    item.textContent = `${role}-${index}`
    menu.append(item)
  })
  document.body.append(menu)
  return menu
}

describe('MENU_ITEM_SELECTOR', () => {
  it('メニュー項目だけを並び順のまま拾い、区切り線などは数えない', () => {
    const menu = menuOf(['menuitem', 'separator', 'menuitem', 'presentation'])
    const items = Array.from(menu.querySelectorAll(MENU_ITEM_SELECTOR))
    expect(items.map(item => item.textContent)).toEqual(['menuitem-0', 'menuitem-2'])
  })
})
