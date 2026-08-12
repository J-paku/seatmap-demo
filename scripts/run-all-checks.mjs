#!/usr/bin/env node
// run-all-checks.mjs — verify-s1.js と verify-edit-anchors.js を BASE_URL の対象へ
// 状態ごとに注入し、結果をまとめて判定するハーネス。詳細は docs/seat-map/testing.md を参照。
//
// 使い方:
//   node scripts/run-all-checks.mjs [BASE_URL]
//   BASE_URL=http://localhost:4173/ node scripts/run-all-checks.mjs
//   PLAYWRIGHT_NODE_MODULES=/path/to/other-repo/node_modules node scripts/run-all-checks.mjs
//
// 終了コード: 0 = 全状態 PASS / 1 = いずれかの状態が FAIL(到達失敗も含む) / 2 = ハーネス自体の
// エラー(Playwright 未解決・検証スクリプト読み込み失敗など、対象アプリのバグではないもの)
//
// 前提: このリポジトリに Playwright は入っていない(package.json に追加しない方針)。既定では
// 隣の J-paku.github.io リポジトリの node_modules を借りる。ESM は NODE_PATH を見ないため
// createRequire で CJS 解決する。見つからなければ何をすればよいか出力して終了コード2で止まる。
//
// 対象は dev(3000)ではなく静的配信(4173、`npm run build` の out/ を配信)を既定にする。
// この repo は /mnt/c 上で inotify が効かず、dev は古いバンドルを配り続けることがある
// (docs/seat-map/testing.md 4章、~/.claude/rules/03-pitfalls.md 9番)。

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

// ---- 0. Playwright の解決。この repo に無いので他 repo の node_modules を借りる ----
// ESM は NODE_PATH を見ないため、CJS 用の createRequire で「PLAYWRIGHT_NODE_MODULES の中の
// ファイル」を起点に解決させる(その親ディレクトリの node_modules = PLAYWRIGHT_NODE_MODULES 自身
// が Node の通常の探索順で見つかる)。
const loadChromium = () => {
  const requireFromBorrowed = createRequire(path.join(PLAYWRIGHT_NODE_MODULES, 'noop.js'))
  try {
    return requireFromBorrowed('playwright').chromium
  } catch (e) {
    console.error('[run-all-checks] Playwright が見つかりません。')
    console.error(`  参照先(PLAYWRIGHT_NODE_MODULES): ${PLAYWRIGHT_NODE_MODULES}`)
    console.error('  対処:')
    console.error('    1) このリポジトリの package.json に playwright を追加しない方針のため、')
    console.error('       Playwright がインストール済みの他 repo の node_modules を')
    console.error('       PLAYWRIGHT_NODE_MODULES 環境変数で指定してください。')
    console.error('       例: PLAYWRIGHT_NODE_MODULES=/path/to/repo/node_modules node scripts/run-all-checks.mjs')
    console.error('    2) それも無ければ、どこかで `npm install playwright` を実行し、その')
    console.error('       node_modules を上記の変数で指定してください。')
    console.error(`  詳細: ${e.message}`)
    process.exit(2)
  }
}

// ---- 1. 注入する検証スクリプト2種の読み込み ----
const readVerifyScript = (name) => {
  const file = path.join(SCRIPTS_DIR, name)
  try {
    return readFileSync(file, 'utf8')
  } catch (e) {
    console.error(`[run-all-checks] 検証スクリプトを読めません: ${file}`)
    console.error(`  詳細: ${e.message}`)
    process.exit(2)
  }
}
const VERIFY_S1_SRC = readVerifyScript('verify-s1.js')
const VERIFY_EDIT_ANCHORS_SRC = readVerifyScript('verify-edit-anchors.js')

// ---- 2. コーチマーク既読キーの取得。ハードコードせず、ソースの `_STORAGE_KEY = '...'` 定義を
// 走査して集める(components/CoachMarkTour/utils/tour-steps.ts §「コーチマーク既読キー」表と同じ
// 情報源)。新しいキーが増えても、この関数を直す必要はない ----
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

// ---- 2-2. ログインゲートの通過キー。撒かないとログイン画面で止まり、どの状態にも到達できない
// (画面は正常に描画されるので接続エラーにもならず、全状態が同じ理由で「到達失敗」になる)。
// キーは lib/session-auth.ts の定義をソースから読む(二重定義にしない)。値は writeSessionAuth と
// 同じ JSON 形にする — ゲート自体は非 null なら通すが、保存形が違うと読む側で崩れうる ----
const SESSION_AUTH = (() => {
  const file = path.join(REPO_ROOT, 'lib/session-auth.ts')
  if (!existsSync(file)) return null
  const m = readFileSync(file, 'utf8').match(/SESSION_AUTH_KEY\s*=\s*'([^']+)'/)
  if (!m) {
    console.error('[run-all-checks] lib/session-auth.ts の SESSION_AUTH_KEY を読めません。')
    console.error('  対処: 定数名を変えたなら、この抽出正規表現も合わせて直してください。')
    process.exit(2)
  }
  return { key: m[1], value: JSON.stringify({ loginId: 'E0001' }) }
})()

// ---- 3. 画面状態ごとの到達手順。verify-edit-anchors.js の状態判定(state)と1対1で対応させる ----

const CANVAS_LAYER_SELECTOR = '[data-canvas-transform-layer="true"]'

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
        // localStorage / sessionStorage が使えない環境でも到達確認自体は続行させる
      }
    },
    { keys: COACH_MARK_KEYS, auth: SESSION_AUTH }
  )
  // 接続自体ができない(ホスト間違い・サーバー未起動)場合は、どの状態を試しても同じ理由で
  // 全滅するだけなので、状態ごとの FAIL には振り分けず、ハーネス自体のエラーとして即終了する。
  // ここで BASE_URL をそのまま出す(引数がハードコードで無視されていないことの実証)
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 })
  } catch (e) {
    await context.close()
    console.error(`[run-all-checks] 対象(${BASE_URL})に接続できません。`)
    console.error(`  詳細: ${e.message.split('\n')[0]}`)
    console.error('  対処: BASE_URL が正しいか、対象サーバーが起動しているか確認してください(ss -ltn 等)。')
    process.exit(2)
  }
  return { context, page, consoleErrors }
}

const reachBrowsing = async () => {
  // 既定状態。追加操作は不要
}

const reachEditSession = async (page) => {
  await page.getByRole('button', { name: '追加メニューを開く' }).click()
  await page.getByRole('menuitem', { name: 'レイアウトを編集', exact: true }).click()
  await page.waitForSelector('[data-edit-mode-badge="true"]', { timeout: 8000 })
}

const reachGhostPlacement = async (page) => {
  await page.getByRole('button', { name: '追加メニューを開く' }).click()
  await page.getByRole('menuitem', { name: 'チーム', exact: true }).click()
  await page.getByRole('dialog', { name: 'チームを追加' }).waitFor({ state: 'visible', timeout: 8000 })
  await page.locator('button:has-text("新規作成")').click()
  await page.waitForSelector('[role="img"][aria-label="配置プレビュー（ドラッグで移動）"]', { timeout: 8000 })
}

const reachOverlayView = async (page) => {
  const teamBox = page.locator('[data-team-id]').first()
  await teamBox.waitFor({ state: 'visible', timeout: 8000 })
  await teamBox.click()
  // verify-edit-anchors.js と同じ条件(aria-label が「 座席配置」で終わる dialog)で到達確認する
  await page.waitForFunction(
    () => [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some((d) => / 座席配置$/.test(d.getAttribute('aria-label') || '')),
    { timeout: 8000 }
  )
}

const reachOverlayEdit = async (page) => {
  await reachOverlayView(page)
  await page.getByRole('button', { name: '所属人員を編集' }).click()
  await page.waitForSelector('[role="group"][aria-label="編集ツールバー"]', { timeout: 8000 })
}

// verifyS1 = この状態で verify-s1.js(キャンバス不変条件)も走らせるか。オーバーレイ系はモーダルが
// キャンバス手前を覆うため、「チーム箱がクリックを直接受ける」等が構造的に無関係な理由で FAIL する。
// 対象外にする判断は docs/seat-map/testing.md に明記する
const STATES = [
  { id: 'browsing', label: '閲覧', reach: reachBrowsing, verifyS1: true },
  { id: 'edit-session', label: '編集セッション中', reach: reachEditSession, verifyS1: true },
  { id: 'ghost-placement', label: 'ゴースト配置中', reach: reachGhostPlacement, verifyS1: true },
  { id: 'overlay-view', label: 'チームオーバーレイ', reach: reachOverlayView, verifyS1: false },
  { id: 'overlay-edit', label: 'オーバーレイ編集中', reach: reachOverlayEdit, verifyS1: false },
]

// ---- 4. 1状態分の実行。到達失敗は「0件検査で PASS」にせず、明示的な fail 1件を持つ結果にする ----
const runState = async (browser, stateDef) => {
  const { id, label, reach, verifyS1 } = stateDef
  let context
  try {
    const opened = await openFreshPage(browser)
    context = opened.context
    const { page, consoleErrors } = opened

    try {
      // 変換レイヤーの出現待ちも「到達手順」の一部として扱う。ここが出ない(アプリが壊れて
      // 描画されない等)場合も、接続自体の失敗(openFreshPage 側)とは分けて状態別 FAIL にする
      await page.waitForSelector(CANVAS_LAYER_SELECTOR, { timeout: 15000 })
      await page.waitForTimeout(600)
      await reach(page)
    } catch (e) {
      return {
        id,
        label,
        reached: false,
        reason: e.message,
        checkedAnchors: 0,
        pass: 0,
        fail: 1,
        verdict: 'FAIL',
        detail: [`到達失敗: ${e.message}`],
        consoleErrors,
      }
    }

    const anchorsResult = await page.evaluate(VERIFY_EDIT_ANCHORS_SRC)
    if (anchorsResult.state !== id) {
      return {
        id,
        label,
        reached: false,
        reason: `状態不一致(狙い=${id} / 実際=${anchorsResult.state})`,
        checkedAnchors: 0,
        pass: 0,
        fail: 1,
        verdict: 'FAIL',
        detail: [`狙った状態(${id})と verify-edit-anchors.js が判定した状態(${anchorsResult.state})が一致しない`],
        consoleErrors,
      }
    }

    const s1Result = verifyS1 ? await page.evaluate(VERIFY_S1_SRC) : null

    const anchorsChecked = anchorsResult.checkedAnchors
    const s1Checked = s1Result ? s1Result.pass.length + s1Result.fail.length : 0
    const checkedAnchors = anchorsChecked + s1Checked
    const failCount = anchorsResult.fail.length + (s1Result ? s1Result.fail.length : 0)
    const passCount = anchorsResult.pass.length + (s1Result ? s1Result.pass.length : 0)
    // 空虚な通過の防止: このハーネス全体の判定基準は「0件検査は PASS にしない」(B-2 要求)
    const verdict = checkedAnchors === 0 ? 'FAIL' : failCount === 0 ? 'PASS' : 'FAIL'

    return {
      id,
      label,
      reached: true,
      checkedAnchors,
      pass: passCount,
      fail: failCount,
      verdict,
      anchorsResult,
      s1Result,
      consoleErrors,
    }
  } finally {
    if (context) await context.close()
  }
}

// ---- 5. 出力整形 ----
const printStateResult = (r) => {
  console.log(`\n=== [${r.id}] ${r.label} ===`)
  if (!r.reached) {
    console.log(`  到達失敗: ${r.reason}`)
    return
  }
  console.log(`  verify-edit-anchors.js: state=${r.anchorsResult.state} checked=${r.anchorsResult.checkedAnchors} pass=${r.anchorsResult.pass.length} fail=${r.anchorsResult.fail.length}`)
  if (r.anchorsResult.fail.length > 0) r.anchorsResult.fail.forEach((f) => console.log(`    FAIL(anchors): ${f}`))
  if (r.s1Result) {
    console.log(`  verify-s1.js: verdict=${r.s1Result.verdict} pass=${r.s1Result.pass.length} fail=${r.s1Result.fail.length}`)
    if (r.s1Result.fail.length > 0) r.s1Result.fail.forEach((f) => console.log(`    FAIL(s1): ${f}`))
  }
  if (r.consoleErrors.length > 0) {
    console.log('  ページ内エラー:')
    r.consoleErrors.forEach((e) => console.log(`    ${e}`))
  }
  console.log(`  → ${r.verdict}(checked=${r.checkedAnchors} pass=${r.pass} fail=${r.fail})`)
}

// ---- 6. main ----
const main = async () => {
  console.log(`TARGET: ${BASE_URL}`)
  console.log(`PLAYWRIGHT_NODE_MODULES: ${PLAYWRIGHT_NODE_MODULES}`)
  console.log(`コーチマーク既読キー(${COACH_MARK_KEYS.length}件): ${COACH_MARK_KEYS.join(', ')}`)

  const chromium = loadChromium()
  const browser = await chromium.launch()

  const results = []
  try {
    for (const stateDef of STATES) {
      const r = await runState(browser, stateDef)
      results.push(r)
      printStateResult(r)
    }
  } finally {
    await browser.close()
  }

  const totalChecked = results.reduce((sum, r) => sum + r.checkedAnchors, 0)
  const totalFail = results.reduce((sum, r) => sum + r.fail, 0)
  const anyUnreached = results.some((r) => !r.reached)
  const overallVerdict = totalChecked > 0 && totalFail === 0 && !anyUnreached ? 'PASS' : 'FAIL'

  console.log(`\n=== 総計 ===`)
  console.log(`検査対象状態: ${results.length} / 到達成功: ${results.filter((r) => r.reached).length}`)
  console.log(`総検査数: ${totalChecked} / pass: ${totalChecked - totalFail} / fail: ${totalFail}`)
  console.log(`最終判定: ${overallVerdict}`)

  process.exit(overallVerdict === 'PASS' ? 0 : 1)
}

main().catch((e) => {
  console.error('[run-all-checks] HARNESS ERROR:', e.message)
  console.error(e.stack)
  process.exit(2)
})
