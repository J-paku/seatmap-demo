#!/usr/bin/env node
// verify-offscreen-indicator.mjs — オフスクリーンチームインジケーターの受入検証。
// 全チームエリアが画面外に出た時だけ端に出る「最近傍チームへ移動」ボタンを、実ブラウザで確かめる。
//
// 使い方:
//   node scripts/verify-offscreen-indicator.mjs [BASE_URL]
//   BASE_URL=http://localhost:4173/ node scripts/verify-offscreen-indicator.mjs
//   PLAYWRIGHT_NODE_MODULES=/path/to/other-repo/node_modules node scripts/verify-offscreen-indicator.mjs
//
// 終了コード: 0 = 全項目 PASS / 1 = いずれか FAIL / 2 = ハーネス自体のエラー(Playwright 未解決など)
//
// 対象は dev(3000)ではなく静的配信(4173、`npm run build` の out/ を配信)を既定にする。
// この repo は /mnt/c 上で inotify が効かず、dev は古いバンドルを配り続けることがある
// (docs/seat-map/testing.md 4章)。
//
// 検出力の確認方法: use-offscreen-team-indicator.ts の aisle 除外行を消して再ビルドすると
// B群(通路のみ)が FAIL に落ちる。新しく書いた検証は一度わざと落としてから採用すること。

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
const loadChromium = () => {
  try {
    return createRequire(path.join(PLAYWRIGHT_NODE_MODULES, 'noop.js'))('playwright').chromium
  } catch (e) {
    console.error('[verify-offscreen-indicator] Playwright が見つかりません。')
    console.error(`  参照先(PLAYWRIGHT_NODE_MODULES): ${PLAYWRIGHT_NODE_MODULES}`)
    console.error('  対処: Playwright 入りの他 repo の node_modules を PLAYWRIGHT_NODE_MODULES で指定してください。')
    console.error(`  詳細: ${e.message}`)
    process.exit(2)
  }
}

// ---- 1. 画面前提の解除キー。ハードコードせずソースから集める(run-all-checks.mjs と同じ情報源) ----
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

// ログインゲートがある構成では通過キーを撒いて素通りさせる。キーは lib/session-auth.ts の
// 定義をソースから読む(二重定義にしない)。ゲートが無い構成では null のまま何もしない
const SESSION_AUTH_KEY = (() => {
  const file = path.join(REPO_ROOT, 'lib/session-auth.ts')
  if (!existsSync(file)) return null
  const m = readFileSync(file, 'utf8').match(/SESSION_AUTH_KEY\s*=\s*'([^']+)'/)
  if (!m) {
    console.error('[verify-offscreen-indicator] lib/session-auth.ts の SESSION_AUTH_KEY を読めません。')
    process.exit(2)
  }
  return m[1]
})()

// mocks の実測値。通路だけが見える位置(B群)を作るのに使う
const AISLE = { x: 1020, y: 6, w: 60, h: 1108 }
const MEETING_BAND = { left: 1080, right: 1330, top: 15, bottom: 1099 }
// 論理座標 x[750,1070] y[900,1125] は通路のみを含む(チーム x30..1020 / 会議室 x1080.. の隙間)
const AISLE_ONLY_CENTER = { x: (750 + 1070) / 2, y: (900 + 1125) / 2 }

const INDICATOR = 'button[aria-label^="チーム "][aria-label$=" へ移動"]'

const results = []
const ck = (name, ok, detail) => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const chromium = loadChromium()
const browser = await chromium.launch()

const openPage = async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') pageErrors.push(`console.error: ${m.text()}`)
  })
  await page.addInitScript(
    ({ authKey, coachKeys }) => {
      try {
        if (authKey) window.sessionStorage.setItem(authKey, 'E0001')
        coachKeys.forEach((k) => window.localStorage.setItem(k, '1'))
      } catch {
        // プライベートモード等で書けない環境でも到達確認は続行させる
      }
    },
    { authKey: SESSION_AUTH_KEY, coachKeys: COACH_MARK_KEYS }
  )
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForSelector('[data-canvas-transform-layer="true"]', { timeout: 20000 })
  } catch (e) {
    console.error(`[verify-offscreen-indicator] 対象(${BASE_URL})に到達できません。`)
    console.error(`  詳細: ${e.message.split('\n')[0]}`)
    console.error('  対処: BASE_URL が正しいか、対象サーバーが起動しているか確認してください(ss -ltn 等)。')
    await browser.close()
    process.exit(2)
  }
  await page.waitForTimeout(500)
  return { context, page, pageErrors }
}

// 変換レイヤーの transform 行列から現在の論理ビューポートを実測する
const readViewport = (page) =>
  page.evaluate(() => {
    const layer = document.querySelector('[data-canvas-transform-layer="true"]')
    const container = layer.parentElement
    const m = new DOMMatrixReadOnly(getComputedStyle(layer).transform)
    const r = container.getBoundingClientRect()
    return { scale: m.a, tx: m.e, ty: m.f, cw: r.width, ch: r.height }
  })

const drag = async (page, dx, dy) => {
  await page.mouse.move(640, 450)
  await page.mouse.down()
  await page.mouse.move(640 + dx / 2, 450 + dy / 2, { steps: 6 })
  await page.mouse.move(640 + dx, 450 + dy, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(150)
}

// ---- A群: 全チームが画面外 → 出現・外観・クリックで復帰 ----
{
  const { context, page, pageErrors } = await openPage()

  ck('初期表示ではインジケーターが出ない', (await page.$(INDICATOR)) === null)

  let appeared = false
  for (let i = 0; i < 14 && !appeared; i++) {
    await drag(page, -560, -360)
    appeared = (await page.$(INDICATOR)) !== null
  }
  ck('全チームが画面外でインジケーターが出る', appeared, appeared ? '' : 'パン14回で出ず')

  if (appeared) {
    const info = await page.evaluate((sel) => {
      const btn = document.querySelector(sel)
      const r = btn.getBoundingClientRect()
      const layer = document.querySelector('[data-canvas-transform-layer="true"]')
      const cells = [...btn.firstElementChild.children]
      const label = cells.find((el) => el.textContent.trim().length > 0)
      return {
        ariaLabel: btn.getAttribute('aria-label'),
        inViewport: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
        insideTransformLayer: layer.contains(btn),
        zIndex: getComputedStyle(btn).zIndex,
        labelBg: label ? getComputedStyle(label).backgroundColor : null,
        svgHidden: btn.querySelector('svg')?.getAttribute('aria-hidden'),
        overlapsZoomControls: (() => {
          const z = document.querySelector('[data-coach="zoom-controls"]')?.getBoundingClientRect()
          if (!z) return false
          return r.left < z.right && r.right > z.left && r.top < z.bottom && r.bottom > z.top
        })(),
        teamsOnScreen: [...document.querySelectorAll('[data-team-id]')].filter((t) => {
          const b = t.getBoundingClientRect()
          return b.right > 0 && b.left < innerWidth && b.bottom > 0 && b.top < innerHeight
        }).length,
      }
    }, INDICATOR)

    ck('aria-label が仕様どおり', /^チーム .+ へ移動$/.test(info.ariaLabel), info.ariaLabel)
    ck('変換レイヤーの外にある(画面固定)', info.insideTransformLayer === false)
    ck('ビューポート内に収まっている', info.inViewport)
    ck('z-index が --z-index-sticky(200)', info.zIndex === '200', info.zIndex)
    ck('SVG が aria-hidden', info.svgHidden === 'true', String(info.svgHidden))
    ck('ラベルがチーム色地', /^rgb/.test(info.labelBg || ''), info.labelBg)
    ck('ズームコントロールと重ならない', info.overlapsZoomControls === false)
    ck('出現時にチーム箱が画面内に無い', info.teamsOnScreen === 0, `${info.teamsOnScreen}件`)

    await page.click(INDICATOR)
    await page.waitForTimeout(900)
    const after = await page.evaluate((sel) => ({
      indicator: document.querySelector(sel) !== null,
      teamsOnScreen: [...document.querySelectorAll('[data-team-id]')].filter((t) => {
        const b = t.getBoundingClientRect()
        return b.right > 0 && b.left < innerWidth && b.bottom > 0 && b.top < innerHeight
      }).length,
      live: [...document.querySelectorAll('[aria-live]')].map((el) => el.textContent || '').join(' | '),
    }), INDICATOR)

    ck('クリックでチームが画面内に戻る', after.teamsOnScreen > 0, `${after.teamsOnScreen}件`)
    ck('移動後にインジケーターが消える', after.indicator === false)
    ck('移動アナウンスが LiveRegion に出る', /チーム .+ へ移動しました/.test(after.live))
  }

  ck('ページエラーが無い', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
  await context.close()
}

// ---- B群: 通路(aisle)だけが見える位置でも出る(決定 D3。通路は抑止条件から除外する) ----
{
  const { context, page } = await openPage()

  for (let i = 0; i < 8; i++) {
    const v = await readViewport(page)
    if (v.scale >= 3.9) break
    await page.click('button[aria-label="拡大"]')
    await page.waitForTimeout(260)
  }

  for (let i = 0; i < 24; i++) {
    const v = await readViewport(page)
    const curX = (v.cw / 2 - v.tx) / v.scale
    const curY = (v.ch / 2 - v.ty) / v.scale
    const needX = (AISLE_ONLY_CENTER.x - curX) * v.scale
    const needY = (AISLE_ONLY_CENTER.y - curY) * v.scale
    if (Math.abs(needX) < 6 && Math.abs(needY) < 6) break
    const clampPx = (n) => Math.max(-500, Math.min(500, n))
    await drag(page, clampPx(-needX), clampPx(-needY))
  }

  const state = await page.evaluate((sel) => {
    const layer = document.querySelector('[data-canvas-transform-layer="true"]')
    const container = layer.parentElement
    const m = new DOMMatrixReadOnly(getComputedStyle(layer).transform)
    const r = container.getBoundingClientRect()
    return {
      vp: {
        left: -m.e / m.a,
        top: -m.f / m.a,
        right: (r.width - m.e) / m.a,
        bottom: (r.height - m.f) / m.a,
      },
      teamsOnScreen: [...document.querySelectorAll('[data-team-id]')].filter((t) => {
        const b = t.getBoundingClientRect()
        return b.right > 0 && b.left < innerWidth && b.bottom > 0 && b.top < innerHeight
      }).length,
      indicator: document.querySelector(sel) !== null,
    }
  }, INDICATOR)

  // 「通路だけが見えている」状態を作れたことを先に実測してから本判定に入る
  const vp = state.vp
  const aisleVisible =
    AISLE.x < vp.right && AISLE.x + AISLE.w > vp.left && AISLE.y < vp.bottom && AISLE.y + AISLE.h > vp.top
  const meetingVisible =
    MEETING_BAND.left < vp.right &&
    MEETING_BAND.right > vp.left &&
    MEETING_BAND.top < vp.bottom &&
    MEETING_BAND.bottom > vp.top

  ck('通路がビューポート内にある', aisleVisible, JSON.stringify(vp))
  ck('会議室がビューポート外', !meetingVisible)
  ck('チーム箱がビューポート外', state.teamsOnScreen === 0, `${state.teamsOnScreen}件`)
  ck('通路のみ見える位置でもインジケーターが出る(D3)', state.indicator)

  await context.close()
}

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\nverdict: ${failed.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failed.length}/${results.length})`)
process.exit(failed.length === 0 ? 0 : 1)
