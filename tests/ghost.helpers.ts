// ゴースト配置の E2E が使う到達手順・画面の実測・検証スクリプトの注入。
// 旧 scripts/run-ghost-checks.mjs の道具を移したもの。シナリオと判定は ghost-placement.spec.ts にある。
//
// 【この検証を直す前に読むこと】スクリプトを通すためにスクリプトを直さない。
// 落ちた判定は実装かフック(data 属性)の不足を指す。到達手順のセレクタは「実装が宣言した DOM
// フック」だけを使い、判定を通すために期待値・許容差・待受セレクタを緩める変更は禁止する
import { type Page } from '@playwright/test'
import { readVerifyScript } from './seatmap.helpers'

// 到達待ちには「変更禁止」と宣言済みのアンカーだけを使う。新しいフック(data-ghost=...)は
// 判定側(verify-ghost.js)が要求する — 待受を新フックにすると、フック未実装のあいだ
// 全シナリオが到達失敗に落ちて、何が足りないのかが読めなくなる
const GHOST_ANCHOR = '[aria-label="配置プレビュー（ドラッグで移動）"]'
const EDIT_BADGE = '[data-edit-mode-badge="true"]'

// ---- 注入 ----
// 呼び出し側の期待は window.__ghostVerify で渡す(意味は scripts/verify-ghost.js 冒頭)
export type GhostOptions = {
  phase: string
  mode: 'open' | 'closed'
  expectBlocked?: boolean
  expectGuides?: 'some' | 'none'
  expectState?: 'idle' | 'dragging' | 'resizing'
  probes?: boolean
}

export type GhostReport = {
  verdict: string
  phase: string | null
  checked: number
  pass: string[]
  fail: string[]
  skip: string[]
}

const VERIFY_GHOST = readVerifyScript('verify-ghost.js')

export const inject = async (page: Page, options: GhostOptions): Promise<GhostReport> => {
  await page.evaluate(o => {
    Object.assign(window, { __ghostVerify: o })
  }, options)
  // verify-ghost.js は Promise を返す即時実行関数。page.evaluate はその解決値を待って返す
  const result = await page.evaluate<GhostReport>(VERIFY_GHOST)
  await page.evaluate(() => {
    Reflect.deleteProperty(window, '__ghostVerify')
  })
  return result
}

// ---- 画面の実測 ----
type Box = { left: number; top: number; right: number; bottom: number }
type Point = { x: number; y: number }

export const readCounts = (page: Page) =>
  page.evaluate(() => ({
    editObjects: document.querySelectorAll('[data-edit-object]').length,
    facilities: document.querySelectorAll('[data-facility="true"]').length,
    objects: document.querySelectorAll('[data-furniture-id]').length,
    teams: document.querySelectorAll('[data-team-id]').length,
  }))

const ghostCenter = async (page: Page): Promise<Point> => {
  // 中央ハンドルはポインタを受けないので、この座標で押すと枠(.preview)が受ける。
  // 枠側へアンカーが移っても中心は変わらない
  const box = await page.locator(GHOST_ANCHOR).first().boundingBox()
  if (!box) throw new Error('ゴーストの位置を実測できない(アンカーが見つからない)')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

// 障害物(チーム枠・会議室・通路・家具)の画面矩形。空き位置の候補探索に使う。
// 障害物判定は utils/layout/layout-rules(チーム枠+施設)より広く取る — 広く取れば
// 「空いている」と判定した点は必ず本当に空いている
const readObstacles = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-team-id], [data-furniture-id]')].map(el => {
      const r = el.getBoundingClientRect()
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    })
  )

const readCanvasRect = (page: Page) =>
  page.evaluate(() => {
    const el = document.getElementById('seatmap-bg-root')
    if (!el) throw new Error('#seatmap-bg-root が無い')
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
  })

const readGhostSize = async (page: Page): Promise<{ width: number; height: number }> => {
  const frame = await page.evaluate(() => {
    const el = document.querySelector('[data-ghost="frame"], [data-ghost-frame="true"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { width: r.width, height: r.height }
  })
  if (frame) return frame
  // 枠フックが未実装のあいだは中央ハンドル(36px角)しか測れない。探索は止めず、余白を広めに
  // 見積もって進む(枠フックの不在そのものは verify-ghost.js が fail に落とす)
  const box = await page.locator(GHOST_ANCHOR).first().boundingBox()
  const side = box ? Math.max(box.width, box.height) : 0
  return { width: Math.max(side, 240), height: Math.max(side, 240) }
}

// 端自動パン(端から56px)に触れない範囲で、ゴーストがどの障害物とも重ならない中心座標を探す。
// aligned=true なら、さらに「障害物の辺・中心線とゴーストの辺・中心線が揃う」点を優先する
// (揃えば吸着が起き、ガイド線が出る = 出現側の網羅ができる)
export const findSpot = async (page: Page, { aligned }: { aligned: boolean }) => {
  const [obstacles, canvas, size] = await Promise.all([
    readObstacles(page),
    readCanvasRect(page),
    readGhostSize(page),
  ])
  const EDGE = 70
  const MARGIN = 12
  const halfW = size.width / 2
  const halfH = size.height / 2
  const free = (cx: number, cy: number): boolean => {
    const box: Box = {
      left: cx - halfW - MARGIN,
      top: cy - halfH - MARGIN,
      right: cx + halfW + MARGIN,
      bottom: cy + halfH + MARGIN,
    }
    if (box.left < canvas.left + EDGE || box.right > canvas.right - EDGE) return false
    if (box.top < canvas.top + EDGE || box.bottom > canvas.bottom - EDGE) return false
    return !obstacles.some(
      o => box.left < o.right && box.right > o.left && box.top < o.bottom && box.bottom > o.top
    )
  }
  const xs: number[] = []
  const ys: number[] = []
  const step = 24
  for (let x = canvas.left + EDGE + halfW; x <= canvas.right - EDGE - halfW; x += step) xs.push(x)
  for (let y = canvas.top + EDGE + halfH; y <= canvas.bottom - EDGE - halfH; y += step) ys.push(y)
  if (!aligned) {
    for (const y of ys) for (const x of xs) if (free(x, y)) return { x, y }
    return null
  }
  // 障害物の3本線(始端・中心・終端)へゴーストの3本線を合わせる中心x候補を作る
  const alignedXs: number[] = []
  for (const o of obstacles) {
    for (const line of [o.left, (o.left + o.right) / 2, o.right]) {
      alignedXs.push(line + halfW, line, line - halfW)
    }
  }
  for (const x of alignedXs) for (const y of ys) if (free(x, y)) return { x, y }
  return null
}

// 実マウスでゴーストを掴んで運ぶ。合成 PointerEvent は setPointerCapture が通らないため使わない
export const dragGhostTo = async (
  page: Page,
  target: Point,
  { release = true, steps = 24 }: { release?: boolean; steps?: number } = {}
): Promise<void> => {
  const from = await ghostCenter(page)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps })
  await page.waitForTimeout(120)
  if (release) {
    await page.mouse.up()
    await page.waitForTimeout(180)
  }
}

// ---- 到達手順 ----
export const openCreateFacilityGhost = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: '追加メニューを開く' }).click()
  await page.getByRole('menuitem', { name: '設備', exact: true }).click()
  const sheet = page.locator('[role="dialog"][aria-modal="true"][aria-label="オブジェクトを追加"]')
  await sheet.waitFor({ state: 'visible', timeout: 8000 })
  await sheet.locator('button').filter({ hasText: '施設' }).first().click()
  const picker = page.locator('[role="dialog"][aria-modal="true"][aria-label="施設を選択"]')
  await picker.waitFor({ state: 'visible', timeout: 8000 })
  // 行は未配置のときだけ aria-label を持たない(配置済みは全角括弧つき+disabled)
  await picker.locator('button:not([disabled]):not([aria-label])').first().click()
  await page.waitForSelector(GHOST_ANCHOR, { timeout: 8000 })
  await page.waitForTimeout(200)
}

// 開けた施設の data-edit-object を返す
export const openRepositionGhost = async (page: Page): Promise<string | null> => {
  await page.getByRole('button', { name: '追加メニューを開く' }).click()
  await page.getByRole('menuitem', { name: 'レイアウトを編集', exact: true }).click()
  await page.waitForSelector(EDIT_BADGE, { timeout: 8000 })
  await page.waitForTimeout(300)
  const targets = page.locator('[data-edit-object^="facility:"]')
  await targets.first().waitFor({ state: 'visible', timeout: 8000 })
  // ロック中・レイアウト固定の対象はタップしてもゴーストが開かない(理由トーストが出るだけ)。
  // 何件目で開いたかは結果に関係しないので、開くまで順に試す
  const count = await targets.count()
  for (let i = 0; i < count; i++) {
    const target = targets.nth(i)
    const ref = await target.getAttribute('data-edit-object')
    await target.click()
    try {
      await page.waitForSelector(GHOST_ANCHOR, { timeout: 2000 })
      await page.waitForTimeout(200)
      return ref
    } catch {
      // 開かなかった = ロック等で拒まれた。次の対象へ
    }
  }
  throw new Error(`掴み直しのゴーストが開かない(施設 ${count}件すべてで開かず)`)
}

export const clickGhostConfirm = (page: Page) =>
  page.getByRole('button', { name: 'この位置に配置' }).click()

export const clickGhostCancel = (page: Page) =>
  page.getByRole('button', { name: '配置をキャンセル' }).click()

export const waitGhostGone = (page: Page) =>
  page.waitForSelector(GHOST_ANCHOR, { state: 'detached', timeout: 8000 })
