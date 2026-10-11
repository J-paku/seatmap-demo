// テストの置き場の境界検査(node scripts/check-test-boundary.mjs)。hooks/ 配下(どの深さでも)の単体テストと、
// src のどこかで renderHook を使うコードを落とす。ロジックは純粋関数(src/lib/・src/utils/・コンポーネントの utils/)で測り、
// フックの動きは E2E が見る。例外の一覧は持たない。見るのは作業ツリー(未追跡のテストも Vitest は走らせるため)。
// 判定の正規表現が壊れて違反を見逃さないよう、走るたびに最初に確かめる(下の「自己検査」)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// cwd に依存しない。どこから呼んでもリポジトリ直下を見る
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(ROOT, 'src')
const SKIP_DIRS = new Set(['node_modules', '.git'])

const CODE_FILE = /\.[cm]?[jt]sx?$/
// Vitest が既定で拾う *.test.* / *.spec.*(*.test-helper.ts のような部品は含めない)
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/
// 親フォルダのどれかが hooks であるパス(use-hooks/ のような名前は含めない)
const HOOKS_DIR = /(^|\/)hooks\//
const RENDER_HOOK = /\brenderHook\b/
// 注釈の中の renderHook は使っていないので外してから照合する。URL の :// は行注釈と取り違えない
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g
const LINE_COMMENT = /(^|[^:])\/\/.*$/gm

const REASON_HOOK_TEST =
  'hooks/ 配下に単体テストは置かない。ロジックを純粋関数(src/lib/・src/utils/・コンポーネントの utils/)へ移してそちらで測り、フックの動きは E2E で見る'
const REASON_RENDER_HOOK =
  'renderHook でフックを呼ばない(hooks/ の外でも、テストの部品でも同じ)。ロジックを純粋関数へ移してそちらで測り、フックの動きは E2E で見る'

// 壊れたシンボリックリンクで statSync が例外を投げないよう、実体の無い入口は集める前に落とす
const walk = dir =>
  readdirSync(dir).flatMap(name => {
    if (SKIP_DIRS.has(name)) return []
    const p = path.join(dir, name)
    const stat = statSync(p, { throwIfNoEntry: false })
    if (stat === undefined) return []
    return stat.isDirectory() ? walk(p) : [p]
  })

const usesRenderHook = code =>
  RENDER_HOOK.test(code.replace(BLOCK_COMMENT, '').replace(LINE_COMMENT, '$1'))

// 1 ファイルの違反の理由(違反でなければ undefined)。hooks/ 配下のテストは中身を問わず違反
const violationOf = (file, readCode) => {
  if (TEST_FILE.test(file) && HOOKS_DIR.test(file)) return REASON_HOOK_TEST
  if (usesRenderHook(readCode())) return REASON_RENDER_HOOK
  return undefined
}

// ---- 自己検査 ----
// 違反と分かっている文字列とそうでない文字列を、実際の検査と同じ関数で判定し、期待と違えば落とす
const TEST_FILE_CASES = [
  ['src/a.test.ts', true],
  ['src/a.spec.tsx', true],
  ['src/a.ts', false],
  ['src/a.test-helper.ts', false],
  ['src/a.test.ts.snap', false],
]
// [パス, 中身, 期待する理由]
const VIOLATION_CASES = [
  ['src/hooks/use-a.test.ts', '', REASON_HOOK_TEST],
  ['src/components/A/hooks/use-b/use-b.test.tsx', '', REASON_HOOK_TEST],
  ['src/hooks/use-a.ts', 'export const useA = () => 1', undefined],
  ['src/use-hooks/a.test.ts', '', undefined],
  ['src/a.test.tsx', 'const r = rtl.renderHook(() => useA())', REASON_RENDER_HOOK],
  ['src/a.test-helper.ts', 'export const r = () => renderHook(useA)', REASON_RENDER_HOOK],
  ['src/a.test.ts', `const r = load('https://example.com/', renderHook)`, REASON_RENDER_HOOK],
  ['src/a.test.ts', 'const a = 1 // renderHook を使わない', undefined],
  ['src/a.test.ts', '/*\n * renderHook を使わない\n */', undefined],
  ['src/a.test.ts', 'const renderHooked = 1', undefined],
]
const selfCheckFailures = [
  ...TEST_FILE_CASES.filter(([file, expected]) => TEST_FILE.test(file) !== expected).map(
    ([file, expected]) => `テストの名前の判定 ${file} → ${expected}`
  ),
  ...VIOLATION_CASES.filter(
    ([file, code, expected]) => violationOf(file, () => code) !== expected
  ).map(([file, code, expected]) => `違反の判定 ${file} ${JSON.stringify(code)} → ${expected}`),
]
if (selfCheckFailures.length > 0) {
  throw new Error(`check-test-boundary: 自己検査に失敗: ${selfCheckFailures.join(', ')}`)
}

const codeFiles = (existsSync(SRC_DIR) ? walk(SRC_DIR) : [])
  .map(file => path.relative(ROOT, file).split(path.sep).join('/'))
  .filter(file => CODE_FILE.test(file))
  .sort()
const testCount = codeFiles.filter(file => TEST_FILE.test(file)).length

// 1件も拾えないときは、違反が無いのではなく見る場所を間違えている
if (testCount === 0) {
  console.error('check-test-boundary: src にテストが1件も無い。対象の指定を疑うこと')
  process.exit(1)
}

const failures = codeFiles.flatMap(file => {
  const reason = violationOf(file, () => readFileSync(path.join(ROOT, file), 'utf8'))
  return reason === undefined ? [] : [`${file}: ${reason}`]
})

if (failures.length > 0) {
  console.error(`check-test-boundary: ${failures.length} 件の違反`)
  for (const line of failures) console.error(`  - ${line}`)
  process.exit(1)
}

console.log(`check-test-boundary: コード ${codeFiles.length} 件・テスト ${testCount} 件 — 違反なし`)
