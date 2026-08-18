#!/usr/bin/env node
// run-ghost-checks.mjs — ゴースト配置セッションを実際に開き、scripts/verify-ghost.js を
// 局面ごとに注入して受入判定する運転台。run-all-checks.mjs と同じ作りで、Playwright は
// 隣のリポジトリの node_modules を借りる(この repo の package.json には足さない方針)。
//
// 【この検証を直す前に読むこと】スクリプトを通すためにスクリプトを直さない。
// 落ちた判定は実装かフック(data 属性)の不足を指す。到達手順のセレクタは「実装が宣言した DOM
// フック」だけを使い、判定を通すために期待値・許容差・待受セレクタを緩める変更は禁止する。
//
// 使い方:
//   node scripts/run-ghost-checks.mjs [BASE_URL]
//   BASE_URL=http://localhost:4173/ node scripts/run-ghost-checks.mjs
//   PLAYWRIGHT_NODE_MODULES=/path/to/other-repo/node_modules node scripts/run-ghost-checks.mjs
//
// 終了コード: 0 = 全シナリオ PASS / 1 = いずれか FAIL(到達失敗・消し込めない skip を含む) /
//             2 = ハーネス自体のエラー(Playwright 未解決・対象へ接続不能・スクリプト読み込み失敗)
//
// 対象は dev(3000)ではなく静的配信(4173)を既定にする(CLAUDE.md「ローカルサーバーとポート」)。
// URL はハードコードせず、第1引数か BASE_URL 環境変数で受ける。
//
// なお Playwright の解決・コーチマーク既読キー・ログインゲート通過は run-all-checks.mjs と
// 同じ手順を持つ(ESM から相互 import できない形のため複製している。片方だけ直さないこと)。

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const SCRIPTS_DIR = path.dirname(__filename)
const REPO_ROOT = path.dirname(SCRIPTS_DIR)

const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:4173/'

const DEFAULT_PLAYWRIGHT_NODE_MODULES = path.resolve(REPO_ROOT, '../J-paku.github.io/node_modules')
const PLAYWRIGHT_NODE_MODULES = process.env.PLAYWRIGHT_NODE_MODULES || DEFAULT_PLAYWRIGHT_NODE_MODULES

// ---- 0. Playwright の解決 ----
const loadChromium = () => {
  const requireFromBorrowed = createRequire(path.join(PLAYWRIGHT_NODE_MODULES, 'noop.js'))
  try {
    return requireFromBorrowed('playwright').chromium
  } catch (e) {
    console.error('[run-ghost-checks] Playwrightが見つかりません。')
    console.error(`  参照先(PLAYWRIGHT_NODE_MODULES): ${PLAYWRIGHT_NODE_MODULES}`)
    console.error('  対処: Playwright を入れてある repo の node_modules を PLAYWRIGHT_NODE_MODULES で指定してください。')
    console.error(`  詳細: ${e.message}`)
    process.exit(2)
  }
}

// ---- 1. 注入する検証スクリプト ----
const VERIFY_GHOST_SRC = (() => {
  const file = path.join(SCRIPTS_DIR, 'verify-ghost.js')
  try {
    return readFileSync(file, 'utf8')
  } catch (e) {
    console.error(`[run-ghost-checks] 検証スクリプトを読めません: ${file}`)
    console.error(`  詳細: ${e.message}`)
    process.exit(2)
  }
})()

// ---- 2. コーチマーク既読キー(ソースから走査。ハードコードしない) ----
const COACH_KEY_RE = /seatmap_coach_[A-Za-z0-9_]+/g
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'out', 'coverage'])
const findCoachMarkKeys = (dir, keys = new Set()) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      findCoachMarkKeys(full, keys)
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue
    const matches = readFileSync(full, 'utf8').match(COACH_KEY_RE)
    if (matches) matches.forEach((m) => keys.add(m))
  }
  return keys
}
const COACH_MARK_KEYS = [...findCoachMarkKeys(REPO_ROOT)]

// ---- 2-2. ログインゲート通過キー(lib/session-auth.ts の定義を読む) ----
const SESSION_AUTH = (() => {
  const file = path.join(REPO_ROOT, 'lib/session-auth.ts')
  if (!existsSync(file)) return null
  const m = readFileSync(file, 'utf8').match(/SESSION_AUTH_KEY\s*=\s*'([^']+)'/)
  if (!m) {
    console.error('[run-ghost-checks] lib/session-auth.ts の SESSION_AUTH_KEY を読めません。')
    process.exit(2)
  }
  return { key: m[1], value: JSON.stringify({ loginId: 'E0001' }) }
})()

// ---- 3. 共通セレクタ ----
// 到達待ちには「変更禁止」と宣言済みのアンカーだけを使う。新しいフック(data-ghost=...)は
// 判定側(verify-ghost.js)が要求する — 待受を新フックにすると、フック未実装のあいだ
// 全シナリオが「到達失敗」に落ちて、何が足りないのかが読めなくなる
const CANVAS_LAYER = '[data-canvas-transform-layer="true"]'
const GHOST_ANCHOR = '[aria-label="配置プレビュー（ドラッグで移動）"]'
const EDIT_BADGE = '[data-edit-mode-badge="true"]'

// ---- 4. ページの用意 ----
const openFreshPage = async (browser) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`console.error: ${m.text()}`)
  })
  await page.addInitScript(
    ({ keys, auth }) => {
      try {
        keys.forEach((k) => localStorage.setItem(k, '1'))
        if (auth) sessionStorage.setItem(auth.key, auth.value)
      } catch {
        // storage が使えない環境でも到達確認自体は続行させる
      }
    },
    { keys: COACH_MARK_KEYS, auth: SESSION_AUTH }
  )
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 })
  } catch (e) {
    await context.close()
    console.error(`[run-ghost-checks] 対象(${BASE_URL})に接続できません。`)
    console.error(`  詳細: ${e.message.split('\n')[0]}`)
    console.error('  対処: BASE_URL と対象サーバーの起動を確認してください(ss -ltn 等)。')
    process.exit(2)
  }
  await page.waitForSelector(CANVAS_LAYER, { timeout: 15000 })
  await page.waitForTimeout(600)
  return { context, page, consoleErrors }
}

// ---- 5. 注入 ----
const inject = async (page, options) => {
  await page.evaluate((o) => {
    window.__ghostVerify = o
  }, options)
  const result = await page.evaluate(VERIFY_GHOST_SRC)
  await page.evaluate(() => {
    delete window.__ghostVerify
  })
  return result
}

// ---- 6. 画面の実測ヘルパー ----
const readCounts = (page) =>
  page.evaluate(() => ({
    editObjects: document.querySelectorAll('[data-edit-object]').length,
    facilities: document.querySelectorAll('[data-facility="true"]').length,
    objects: document.querySelectorAll('[data-furniture-id]').length,
    teams: document.querySelectorAll('[data-team-id]').length,
  }))

const ghostCenter = async (page) => {
  // 中央ハンドルはポインタを受けないので、この座標で押すと枠(.preview)が受ける。
  // 枠側へアンカーが移っても中心は変わらない
  const box = await page.locator(GHOST_ANCHOR).first().boundingBox()
  if (!box) throw new Error('ゴーストの位置を実測できない(アンカーが見つからない)')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

// 障害物(チーム枠・会議室・通路・家具)の画面矩形。free/aligned の候補探索に使う。
// 障害物判定は utils/layout/layout-rules(チーム枠+施設)より広く取る — 広く取れば
// 「空いている」と判定した点は必ず本当に空いている
const readObstacles = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-team-id], [data-furniture-id]')].map((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    })
  )

const readCanvasRect = (page) =>
  page.evaluate(() => {
    const el = document.getElementById('seatmap-bg-root')
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
  })

const readGhostSize = async (page) => {
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
// alignTo=true なら、さらに「障害物の辺・中心線とゴーストの辺・中心線が揃う」点を優先する
// (揃えば吸着が起き、ガイド線が出る = 出現側の網羅ができる)
const findSpot = async (page, { aligned }) => {
  const [obstacles, canvas, size] = await Promise.all([readObstacles(page), readCanvasRect(page), readGhostSize(page)])
  const EDGE = 70
  const MARGIN = 12
  const halfW = size.width / 2
  const halfH = size.height / 2
  const free = (cx, cy) => {
    const box = { left: cx - halfW - MARGIN, top: cy - halfH - MARGIN, right: cx + halfW + MARGIN, bottom: cy + halfH + MARGIN }
    if (box.left < canvas.left + EDGE || box.right > canvas.right - EDGE) return false
    if (box.top < canvas.top + EDGE || box.bottom > canvas.bottom - EDGE) return false
    return !obstacles.some((o) => box.left < o.right && box.right > o.left && box.top < o.bottom && box.bottom > o.top)
  }
  const xs = []
  const ys = []
  const step = 24
  for (let x = canvas.left + EDGE + halfW; x <= canvas.right - EDGE - halfW; x += step) xs.push(x)
  for (let y = canvas.top + EDGE + halfH; y <= canvas.bottom - EDGE - halfH; y += step) ys.push(y)
  if (!aligned) {
    for (const y of ys) for (const x of xs) if (free(x, y)) return { x, y }
    return null
  }
  // 障害物の3本線(始端・中心・終端)へゴーストの3本線を合わせる中心x候補を作る
  const alignedXs = []
  for (const o of obstacles) {
    for (const line of [o.left, (o.left + o.right) / 2, o.right]) {
      alignedXs.push(line + halfW, line, line - halfW)
    }
  }
  for (const x of alignedXs) for (const y of ys) if (free(x, y)) return { x, y }
  return null
}

// 実マウスでゴーストを掴んで運ぶ。合成 PointerEvent は setPointerCapture が通らないため使わない
const dragGhostTo = async (page, target, { release = true, steps = 24 } = {}) => {
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

// ---- 7. 到達手順 ----
const openCreateFacilityGhost = async (page) => {
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

const openRepositionGhost = async (page) => {
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

const clickGhostConfirm = async (page) => {
  await page.getByRole('button', { name: 'この位置に配置' }).click()
}
const clickGhostCancel = async (page) => {
  await page.getByRole('button', { name: '配置をキャンセル' }).click()
}
const waitGhostGone = (page) => page.waitForSelector(GHOST_ANCHOR, { state: 'detached', timeout: 8000 })

// ---- 8. シナリオ ----
// 1シナリオ = 1ページ。前のシナリオの副作用(編集中のワーキングコピー・保存済みレイアウト)を
// 持ち込まない。各シナリオは { checks: [{name, ok, detail}], reports: [注入結果] } を返す

const scenarioCreate = async (page) => {
  const checks = []
  const reports = []
  await openCreateFacilityGhost(page)

  reports.push(await inject(page, { phase: 'create/初期表示', mode: 'open' }))

  // 重なり: チーム枠の中心へ運ぶ(チーム枠は §04-4 の障害物)
  const teamCenter = await page.evaluate(() => {
    const el = document.querySelector('[data-team-id]')
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  await dragGhostTo(page, teamCenter)
  reports.push(await inject(page, { phase: 'create/重なり', mode: 'open', expectBlocked: true }))

  // ガイド: 障害物の辺と揃う空き位置まで運び、掴んだまま注入する
  // (離すと guides は空へ戻る実装なので、押下中でなければ出現側を網羅できない)
  const alignedSpot = await findSpot(page, { aligned: true })
  checks.push({ name: '吸着が起きる空き位置を探索できた', ok: !!alignedSpot, detail: JSON.stringify(alignedSpot) })
  if (alignedSpot) {
    await dragGhostTo(page, alignedSpot, { release: false })
    reports.push(
      await inject(page, {
        phase: 'create/吸着中(掴んだまま)',
        mode: 'open',
        expectState: 'dragging',
        expectBlocked: false,
        expectGuides: 'some',
        probes: false,
      })
    )
    await page.mouse.up()
    await page.waitForTimeout(200)
  }

  // 離すとガイドは消える
  const guidesAfterRelease = await page.evaluate(() => document.querySelectorAll('[data-ghost="guide"]').length)
  checks.push({ name: '離すとガイド線が消える', ok: guidesAfterRelease === 0, detail: `${guidesAfterRelease}本` })

  // 取消: 件数も座標も変わらない
  const beforeCancel = await readCounts(page)
  await clickGhostCancel(page)
  await waitGhostGone(page)
  const afterCancel = await readCounts(page)
  checks.push({
    name: '取消でセッションが閉じ、対象の数が変わらない',
    ok: JSON.stringify(beforeCancel) === JSON.stringify(afterCancel),
    detail: `${JSON.stringify(beforeCancel)} → ${JSON.stringify(afterCancel)}`,
  })
  reports.push(await inject(page, { phase: 'create/取消後', mode: 'closed' }))

  // 確定: 対象が1つ増える
  await openCreateFacilityGhost(page)
  const freeSpot = await findSpot(page, { aligned: false })
  checks.push({ name: '空き位置を探索できた', ok: !!freeSpot, detail: JSON.stringify(freeSpot) })
  if (freeSpot) await dragGhostTo(page, freeSpot)
  const beforeConfirm = await readCounts(page)
  await clickGhostConfirm(page)
  await waitGhostGone(page)
  const afterConfirm = await readCounts(page)
  checks.push({
    name: '確定でセッションが閉じ、対象が1つ増える',
    ok: afterConfirm.editObjects === beforeConfirm.editObjects + 1 && afterConfirm.facilities === beforeConfirm.facilities + 1,
    detail: `edit-object ${beforeConfirm.editObjects} → ${afterConfirm.editObjects} / facility ${beforeConfirm.facilities} → ${afterConfirm.facilities}`,
  })
  reports.push(await inject(page, { phase: 'create/確定後', mode: 'closed' }))
  return { checks, reports }
}

const scenarioReposition = async (page) => {
  const checks = []
  const reports = []
  const ref = await openRepositionGhost(page)
  checks.push({ name: '掴み直しの対象を特定できた', ok: !!ref, detail: String(ref) })

  reports.push(await inject(page, { phase: 'move/初期表示', mode: 'open' }))

  const rectOfRef = () =>
    page.evaluate((r) => {
      const el = document.querySelector(`[data-edit-object="${r}"]`)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { x: b.x, y: b.y, w: b.width, h: b.height }
    }, ref)

  const beforeRect = await rectOfRef()
  const beforeCounts = await readCounts(page)
  const spot = await findSpot(page, { aligned: false })
  checks.push({ name: '移動先の空き位置を探索できた', ok: !!spot, detail: JSON.stringify(spot) })
  if (spot) {
    await dragGhostTo(page, spot)
    const during = await rectOfRef()
    checks.push({
      name: '掴み直し中は実体がその場に残る(1pxも動かない)',
      ok: !!during && !!beforeRect && Math.abs(during.x - beforeRect.x) <= 1 && Math.abs(during.y - beforeRect.y) <= 1,
      detail: `${JSON.stringify(beforeRect)} → ${JSON.stringify(during)}`,
    })
    // 空き位置へ運んだ直後だけ「リサイズ可能で重なっていない」局面になる。
    // ここで注入しないと、リサイズハンドルの属性検査がどの局面でも実測されず skip のまま残る
    reports.push(
      await inject(page, { phase: 'move/空き位置(リサイズ可能)', mode: 'open', expectBlocked: false, probes: false })
    )
    await clickGhostConfirm(page)
    await waitGhostGone(page)
    const afterRect = await rectOfRef()
    const afterCounts = await readCounts(page)
    const moved = afterRect && beforeRect ? Math.hypot(afterRect.x - beforeRect.x, afterRect.y - beforeRect.y) : 0
    checks.push({
      name: '確定でセッションが閉じ、対象の座標が変わる',
      ok: moved > 4,
      detail: `移動量 ${moved.toFixed(1)}px`,
    })
    checks.push({
      name: '掴み直しの確定で対象の数は増えない',
      ok: afterCounts.editObjects === beforeCounts.editObjects,
      detail: `${beforeCounts.editObjects} → ${afterCounts.editObjects}`,
    })
    reports.push(await inject(page, { phase: 'move/確定後', mode: 'closed' }))
  }
  return { checks, reports }
}

const scenarioSessionExit = async (page) => {
  const checks = []
  const reports = []
  await openCreateFacilityGhost(page)
  reports.push(await inject(page, { phase: 'exit/配置中', mode: 'open' }))
  await page.getByRole('button', { name: '編集を終了' }).click()
  await page.waitForTimeout(400)
  const leftovers = await page.evaluate(() => ({
    ghost: document.querySelectorAll('[aria-label="配置プレビュー（ドラッグで移動）"]').length,
    layer: document.querySelectorAll('[data-ghost="layer"]').length,
    badge: document.querySelectorAll('[data-edit-mode-badge="true"]').length,
  }))
  checks.push({
    name: '編集セッションを終了するとゴーストも編集バッジも同時に消える',
    ok: leftovers.ghost === 0 && leftovers.layer === 0 && leftovers.badge === 0,
    detail: JSON.stringify(leftovers),
  })
  reports.push(await inject(page, { phase: 'exit/終了後', mode: 'closed' }))
  return { checks, reports }
}

const SCENARIOS = [
  { id: 'create-facility', label: '新規配置(施設)', run: scenarioCreate },
  { id: 'reposition-facility', label: '掴み直し(施設)', run: scenarioReposition },
  { id: 'session-exit', label: '配置中のセッション終了', run: scenarioSessionExit },
]

// ---- 9. 1シナリオ分の実行 ----
const runScenario = async (browser, def) => {
  let context
  try {
    const opened = await openFreshPage(browser)
    context = opened.context
    const { page, consoleErrors } = opened
    try {
      const { checks, reports } = await def.run(page)
      const failedChecks = checks.filter((c) => !c.ok)
      const reportFails = reports.flatMap((r) => r.fail)
      // 検査0件で FAIL を返した注入(前提不成立で打ち切った回)も1件の失敗として数える。
      // fail 配列が空だからと素通りさせない
      const emptyFails = reports.filter((r) => r.verdict !== 'PASS' && r.fail.length === 0).length
      const checked = checks.length + reports.reduce((sum, r) => sum + r.checked, 0)
      return {
        ...def,
        reached: true,
        checked,
        checks,
        reports,
        failCount: failedChecks.length + reportFails.length + emptyFails,
        consoleErrors,
      }
    } catch (e) {
      // 到達失敗を「0件検査の PASS」にしない。fail 1件を持つ明示的な FAIL にする
      return { ...def, reached: false, reason: e.message, checked: 0, checks: [], reports: [], failCount: 1, consoleErrors }
    }
  } finally {
    if (context) await context.close()
  }
}

// ---- 10. 出力 ----
const nameOf = (entry) => entry.split(' — ')[0]

const printScenario = (r) => {
  console.log(`\n=== [${r.id}] ${r.label} ===`)
  if (!r.reached) {
    console.log(`  到達失敗: ${r.reason}`)
    return
  }
  r.checks.forEach((c) => console.log(`  ${c.ok ? 'pass' : 'FAIL'}(運転台): ${c.name}${c.detail ? ` — ${c.detail}` : ''}`))
  r.reports.forEach((rep) => {
    console.log(`  [${rep.phase}] verdict=${rep.verdict} checked=${rep.checked} pass=${rep.pass.length} fail=${rep.fail.length} skip=${rep.skip.length}`)
    rep.fail.forEach((f) => console.log(`    FAIL: ${f}`))
  })
  if (r.consoleErrors.length > 0) {
    console.log('  ページ内エラー:')
    r.consoleErrors.forEach((e) => console.log(`    ${e}`))
  }
}

// ---- 11. main ----
const main = async () => {
  console.log(`TARGET: ${BASE_URL}`)
  console.log(`PLAYWRIGHT_NODE_MODULES: ${PLAYWRIGHT_NODE_MODULES}`)
  console.log(`コーチマーク既読キー(${COACH_MARK_KEYS.length}件): ${COACH_MARK_KEYS.join(', ')}`)

  const chromium = loadChromium()
  const browser = await chromium.launch()
  const results = []
  try {
    for (const def of SCENARIOS) {
      const r = await runScenario(browser, def)
      results.push(r)
      printScenario(r)
    }
  } finally {
    await browser.close()
  }

  // skip の消し込み: ある局面で skip になった判定は、別の局面で pass していなければならない。
  // 消し込めない skip = その項目は一度も実測されていない = 総合判定は FAIL
  const allReports = results.flatMap((r) => r.reports)
  const passedNames = new Set(allReports.flatMap((rep) => rep.pass.map(nameOf)))
  const skippedNames = new Set(allReports.flatMap((rep) => rep.skip.map(nameOf)))
  const unresolvedSkips = [...skippedNames].filter((n) => !passedNames.has(n))

  const totalChecked = results.reduce((sum, r) => sum + r.checked, 0)
  const totalFail = results.reduce((sum, r) => sum + r.failCount, 0)
  const anyUnreached = results.some((r) => !r.reached)
  const verdict =
    totalChecked > 0 && totalFail === 0 && !anyUnreached && unresolvedSkips.length === 0 ? 'PASS' : 'FAIL'

  console.log('\n=== 総計 ===')
  console.log(`シナリオ: ${results.length} / 到達成功: ${results.filter((r) => r.reached).length}`)
  console.log(`総検査数: ${totalChecked} / fail: ${totalFail}`)
  if (unresolvedSkips.length > 0) {
    console.log(`消し込めない skip(どの局面でも実測されていない判定): ${unresolvedSkips.length}件`)
    unresolvedSkips.forEach((n) => console.log(`  - ${n}`))
  }
  console.log(`最終判定: ${verdict}`)
  process.exit(verdict === 'PASS' ? 0 : 1)
}

main().catch((e) => {
  console.error('[run-ghost-checks] HARNESS ERROR:', e.message)
  console.error(e.stack)
  process.exit(2)
})
