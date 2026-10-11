// 画面状態ごとに verify-edit-anchors.js(§08-4 の E2E アンカー)と verify-s1.js(キャンバス不変条件)を
// 注入して判定する。旧 scripts/run-all-checks.mjs を移したもの(docs/seat-map/testing.md 3章)。
// 状態ごとに新しいページを開いて到達する(前の状態の副作用を持ち込まない)
import { type Page } from '@playwright/test'
import { expect, openSeatMap, readVerifyScript, recordChecked, test } from './seatmap.helpers'

type AnchorsReport = {
  verdict: string
  state: string | null
  checkedAnchors: number
  pass: string[]
  fail: string[]
  skip: string[]
}

type S1Report = { verdict: string; pass: string[]; fail: string[] }

const VERIFY_S1 = readVerifyScript('verify-s1.js')
const VERIFY_EDIT_ANCHORS = readVerifyScript('verify-edit-anchors.js')

// ---- 状態ごとの到達手順。verify-edit-anchors.js の状態判定(state)と1対1で対応させる ----

const reachEditSession = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: '追加メニューを開く' }).click()
  await page.getByRole('menuitem', { name: 'レイアウトを編集', exact: true }).click()
  await page.waitForSelector('[data-edit-mode-badge="true"]', { timeout: 8000 })
}

const reachGhostPlacement = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: '追加メニューを開く' }).click()
  await page.getByRole('menuitem', { name: 'チーム', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'チームを追加' })
    .waitFor({ state: 'visible', timeout: 8000 })
  await page.locator('button:has-text("新規作成")').click()
  await page.waitForSelector('[data-ghost="frame"]', { timeout: 8000 })
}

const reachOverlayView = async (page: Page): Promise<void> => {
  const teamBox = page.locator('[data-team-id]').first()
  await teamBox.waitFor({ state: 'visible', timeout: 8000 })
  await teamBox.click()
  // verify-edit-anchors.js と同じ条件(aria-label が「 座席配置」で終わる dialog)で到達確認する
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some(d =>
        / 座席配置$/.test(d.getAttribute('aria-label') || '')
      ),
    undefined,
    { timeout: 8000 }
  )
}

const reachOverlayEdit = async (page: Page): Promise<void> => {
  await reachOverlayView(page)
  await page.getByRole('button', { name: '所属人員を編集' }).click()
  await page.waitForSelector('[role="group"][aria-label="編集ツールバー"]', { timeout: 8000 })
}

// verifyS1 = この状態で verify-s1.js も走らせるか。オーバーレイ系はモーダルがキャンバス手前を覆うため、
// 「チーム箱がクリックを直接受ける」等が構造的に無関係な理由で落ちる。対象外にする判断は
// docs/seat-map/testing.md 3章に明記してある
const STATES = [
  { id: 'browsing', label: '閲覧', reach: async () => {}, verifyS1: true },
  { id: 'edit-session', label: '編集セッション中', reach: reachEditSession, verifyS1: true },
  { id: 'ghost-placement', label: 'ゴースト配置中', reach: reachGhostPlacement, verifyS1: true },
  { id: 'overlay-view', label: 'チームオーバーレイ', reach: reachOverlayView, verifyS1: false },
  { id: 'overlay-edit', label: 'オーバーレイ編集中', reach: reachOverlayEdit, verifyS1: false },
]

for (const { id, label, reach, verifyS1 } of STATES) {
  test(`${label}(${id})で編集アンカー${verifyS1 ? 'とキャンバス不変条件' : ''}が揃う`, async ({
    page,
  }) => {
    await openSeatMap(page)
    await reach(page)

    const anchors = await page.evaluate<AnchorsReport>(VERIFY_EDIT_ANCHORS)
    // 狙った状態と verify-edit-anchors.js が判定した状態が食い違うなら、検査の中身は見ない
    // (ゴースト配置へ向かったつもりで編集セッションのまま止まっていた、といった取り違えを落とす)
    expect(anchors.state, '狙った状態に着いていない').toBe(id)

    const s1 = verifyS1 ? await page.evaluate<S1Report>(VERIFY_S1) : null
    recordChecked(anchors.checkedAnchors + (s1 ? s1.pass.length + s1.fail.length : 0))
    expect(anchors.fail, 'verify-edit-anchors.js の fail').toEqual([])
    if (s1) expect(s1.fail, 'verify-s1.js の fail').toEqual([])
  })
}
