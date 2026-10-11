// 座席マップの E2E が共通で使う手順。画面を開く前に撒くキー(コーチマーク既読・ログインゲート通過)、
// 計測(GoatCounter)の遮断、ページ内エラーの収集、検証スクリプトの読み込み、判定数の記録を
// 各 spec がここから読む。Playwright が集めるのは *.spec.ts / *.test.ts だけなので、
// この名前ならテスト本体として拾われない
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { expect, test as base, type Page } from '@playwright/test'

const REPO_ROOT = path.resolve(__dirname, '..')

// 変換レイヤー。CLAUDE.md 不変ルール4で固定された DOM フックなので到達待ちに使ってよい
export const CANVAS_LAYER = '[data-canvas-transform-layer="true"]'

// ---- コーチマーク既読キー ----
// 初回訪問のコーチマーク(全画面オーバーレイ)がクリックを奪うので、seatmap_coach_* を '1' にしてから開く。
// キーはハードコードせず src/ の .ts/.tsx を走査して集める
// (components/CoachMarkTour/utils/tour-steps.ts の既読キー一覧表と同じ情報源)。
// ツアーが増えて _STORAGE_KEY 定数が足されても、ここを直す必要はない
const COACH_KEY_RE = /seatmap_coach_[A-Za-z0-9_]+/g

const findCoachMarkKeys = (dir: string, keys: Set<string>): Set<string> => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      findCoachMarkKeys(full, keys)
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue
    const matches = readFileSync(full, 'utf8').match(COACH_KEY_RE)
    if (matches) matches.forEach(m => keys.add(m))
  }
  return keys
}

const COACH_MARK_KEYS = [...findCoachMarkKeys(path.join(REPO_ROOT, 'src'), new Set())]

// ---- ログインゲートの通過キー ----
// 撒かないとログイン画面で止まり、どの状態にも到達できない(画面は正常に描画されるので
// 接続エラーにもならず、全テストが同じ理由で到達失敗になる)。キーは lib/session-auth.ts の
// 定義をソースから読む(二重定義にしない)。値は writeSessionAuth と同じ JSON 形にする —
// ゲート自体は非 null なら通すが、保存形が違うと読む側で崩れうる
type SessionAuth = { key: string; value: string }

const SESSION_AUTH: SessionAuth | null = (() => {
  const file = path.join(REPO_ROOT, 'src/lib/session-auth.ts')
  if (!existsSync(file)) return null
  const hit = readFileSync(file, 'utf8').match(/SESSION_AUTH_KEY\s*=\s*'([^']+)'/)
  if (!hit)
    throw new Error(
      'src/lib/session-auth.ts の SESSION_AUTH_KEY を読めない。定数名を変えたなら抽出の正規表現も直す'
    )
  return { key: hit[1], value: JSON.stringify({ loginId: 'E0001' }) }
})()

// ---- 計測の遮断 ----
// 計測(GoatCounter)へは1通も出さない。計測先を入れて build した out/ を見ても数えられないよう、
// タグの配布元と送信先の両方を塞ぐ
const isGoatCounter = (url: URL): boolean =>
  url.hostname === 'gc.zgo.at' ||
  url.hostname === 'goatcounter.com' ||
  url.hostname.endsWith('.goatcounter.com')

// 座席マップの E2E が使う test。どの context にも計測の遮断と既読・通過キーを敷き、
// どのページにもページ内エラーの収集を付ける。エラーは判定には使わず(移す前の運転台と同じ)、
// 出ていればテスト結果の注記に残す。判定に使う spec は pageErrors を受け取って自分で数える
export const test = base.extend<{ pageErrors: string[] }>({
  // 渡す関数は Playwright の慣例では use と呼ぶが、React の Hook 規則(rules-of-hooks)に
  // 誤って拾われるので別名にする。位置で受け取る引数なので名前を変えても働きは同じ
  context: async ({ context }, provide) => {
    // abort で塞ぐと、計測タグ入りの配信版で count.js の読み込み失敗が console.error に出て
    // ページ内エラーの判定を落とす。外へは出さないまま空の応答を返して塞ぐ
    await context.route(isGoatCounter, route =>
      route.fulfill({ status: 200, contentType: 'text/javascript', body: '' })
    )
    await context.addInitScript(
      ({ keys, auth }) => {
        try {
          // 遮断の二重化。count.js がもし読み込まれても、この印があれば送信しない(GoatCounter の公式の除外手段)
          localStorage.setItem('skipgc', 't')
          keys.forEach(k => localStorage.setItem(k, '1'))
          if (auth) sessionStorage.setItem(auth.key, auth.value)
        } catch {
          // localStorage / sessionStorage が使えない環境でも到達確認自体は続行させる
        }
      },
      { keys: COACH_MARK_KEYS, auth: SESSION_AUTH }
    )
    await provide(context)
  },
  pageErrors: [
    async ({ page }, provide, testInfo) => {
      const errors: string[] = []
      page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
      page.on('console', m => {
        if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
      })
      await provide(errors)
      if (errors.length > 0)
        testInfo.annotations.push({ type: 'page-errors', description: errors.join('\n') })
    },
    { auto: true },
  ],
})

export { expect }

// 座席マップを開き、変換レイヤーが出て描画が落ち着くまで待つ。
// '/' ではなく './' で開く。配信版の baseURL は basePath(/seatmap-demo/)の下にあり、
// '/' だとホストの直下へ解決されて別のページを開いてしまう
export const openSeatMap = async (page: Page): Promise<void> => {
  await page.goto('./', { waitUntil: 'networkidle', timeout: 20_000 })
  await page.waitForSelector(CANVAS_LAYER, { timeout: 15_000 })
  await page.waitForTimeout(600)
}

// 画面へ注入する検証スクリプト(scripts/verify-*.js)の本文。判定の本体はそちらに置いたまま、
// spec は到達手順と結果の断言だけを持つ
export const readVerifyScript = (name: string): string =>
  readFileSync(path.join(REPO_ROOT, 'scripts', name), 'utf8')

// 運転台(spec)自身が下す判定。検証スクリプトの pass/fail と同じく、名前と根拠を残す
export type Check = { name: string; ok: boolean; detail: string }

export const createChecks = () => {
  const checks: Check[] = []
  const ck = (name: string, ok: boolean, detail = ''): void => {
    checks.push({ name, ok, detail })
  }
  return { checks, ck }
}

export const describeCheck = (c: Check): string => (c.detail ? `${c.name} — ${c.detail}` : c.name)

// このテストで下した判定の数を注記に残す。移す前の運転台の総検査数と突き合わせるための記録で、
// 0件なら「何も測らずに緑」なので落とす
export const recordChecked = (checked: number): void => {
  test.info().annotations.push({ type: 'checked', description: String(checked) })
  expect(checked, '判定を1件も下していない(空虚な通過)').toBeGreaterThan(0)
}
