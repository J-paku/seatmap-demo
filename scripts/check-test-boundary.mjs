// テストの置き場の境界検査(node scripts/check-test-boundary.mjs)。hooks/ 配下(どの深さでも)の単体テストと、
// src のどこかで renderHook を使うコードを落とす。ロジックは純粋関数(src/lib/・src/utils/・コンポーネントの utils/)で測り、
// フックの動きは E2E と、コンテナが使うフックは統合テストが見る。例外の一覧は持たない。見るのは作業ツリー(未追跡のテストも Vitest は走らせるため)。
// 判定の正規表現が壊れて違反を見逃さないよう、走るたびに最初に確かめる(下の「自己検査」)
//
// 加えて、コンテナと統合テスト(Vitest Browser Mode。vitest.integration.config.ts)の置き場を見る。
// コンテナを置くフォルダは一覧(scripts/container-dirs.mjs)で決まる。
//   - *.browser.test.*・*.browser.spec.* は、名前がちょうど container.browser.test.tsx で、一覧のフォルダにあり、
//     同じフォルダに container.tsx があるときだけ置ける(統合の設定もこの名前だけを拾う)
//   - container.tsx は一覧のフォルダにだけ置ける
//   - 一覧のフォルダごとに container.tsx と container.browser.test.tsx が要る(改名・移動で一覧が空振りしたら落とす)
//   - container.browser.test.tsx は、同じフォルダの ./container を(型だけでなく)import する(自分のコンテナを描く)。
//     import は TypeScript の構文木で読む(注釈・文字列の中は数えない)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { CONTAINER_DIRS } from './container-dirs.mjs'

// cwd に依存しない。どこから呼んでもリポジトリ直下を見る
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(ROOT, 'src')
const SKIP_DIRS = new Set(['node_modules', '.git'])

const CODE_FILE = /\.[cm]?[jt]sx?$/
// Vitest が既定で拾う *.test.* / *.spec.*(*.test-helper.ts のような部品は含めない)
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/
// 統合テストの名前(上の TEST_FILE のうち、手前が .browser のもの)と、コンテナ・その統合テストの名前
const BROWSER_TEST = /\.browser\.(?:test|spec)\.[cm]?[jt]sx?$/
const CONTAINER = 'container.tsx'
const CONTAINER_TEST = 'container.browser.test.tsx'
// 親フォルダのどれかが hooks であるパス(use-hooks/ のような名前は含めない)
const HOOKS_DIR = /(^|\/)hooks\//
const RENDER_HOOK = /\brenderHook\b/
// 注釈の中の renderHook は使っていないので外してから照合する。URL の :// は行注釈と取り違えない
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g
const LINE_COMMENT = /(^|[^:])\/\/.*$/gm

const REASON_HOOK_TEST =
  'hooks/ 配下に単体テストは置かない。ロジックを純粋関数(src/lib/・src/utils/・コンポーネントの utils/)へ移してそちらで測り、フックの動きは E2E と、コンテナが使うフックはそのコンテナの統合テスト(container.browser.test.tsx)で見る'
const REASON_RENDER_HOOK =
  'renderHook でフックを呼ばない(hooks/ の外でも、テストの部品でも同じ)。ロジックを純粋関数へ移してそちらで測り、フックの動きは E2E と、コンテナが使うフックはそのコンテナの統合テスト(container.browser.test.tsx)で見る'
const REASON_BROWSER_PLACE =
  '統合テスト(*.browser.test.ts・*.browser.test.tsx など)を置けるのは、コンテナの一覧(scripts/container-dirs.mjs)のフォルダで container.tsx と同じフォルダの container.browser.test.tsx だけ' +
  '(統合の設定 vitest.integration.config.ts もこの名前だけを拾う)。断定を、その部品を含むコンテナの container.browser.test.tsx へ移す'
const REASON_CONTAINER_PLACE =
  'container.tsx を置けるのはコンテナの一覧(scripts/container-dirs.mjs)のフォルダだけ。コンテナを足すなら一覧に足し、コンテナでなければ別の名前にする'
const REASON_NO_CONTAINER =
  'コンテナの一覧(scripts/container-dirs.mjs)のフォルダに container.tsx が無い。改名・移動で一覧が空振りしているなら一覧を直し、そうでなければ container.tsx を置く'
const REASON_NO_CONTAINER_TEST =
  'コンテナの一覧(scripts/container-dirs.mjs)のフォルダには container.browser.test.tsx が1本要る。コンテナをフック・子と一緒に実ブラウザで描く統合テストを書く'
const REASON_NOT_OWN_CONTAINER =
  'container.browser.test.tsx は同じフォルダの ./container を(型だけでなく)import して、自分のコンテナを描く。ほかのコンテナや部品を描くなら、そのコンテナの container.browser.test.tsx に書く'

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

// 統合テスト・コンテナの置き場の違反の理由(違反でなければ undefined)。
// exists は作業ツリーにそのパスがあるか、dirs はコンテナの一覧
const placementViolationOf = (file, exists, dirs) => {
  const dir = path.posix.dirname(file)
  const name = path.posix.basename(file)
  if (BROWSER_TEST.test(name)) {
    return name === CONTAINER_TEST && dirs.includes(dir) && exists(`${dir}/${CONTAINER}`)
      ? undefined
      : REASON_BROWSER_PLACE
  }
  if (name === CONTAINER && !dirs.includes(dir)) return REASON_CONTAINER_PLACE
  return undefined
}

// import 文の型だけの判定。import type と、波括弧の中が全部 type 付きのものだけが型だけ。
// 既定の import・名前空間の import・何も取り出さない import(副作用だけ)は実行時に読み込まれる
const isTypeOnlyImport = clause => {
  if (clause === undefined) return false
  if (clause.phaseModifier === ts.SyntaxKind.TypeKeyword) return true
  if (clause.name !== undefined) return false
  const bindings = clause.namedBindings
  if (bindings === undefined || !ts.isNamedImports(bindings)) return false
  return bindings.elements.length > 0 && bindings.elements.every(element => element.isTypeOnly)
}

// 1 ファイルの中で、実行時に読み込まれる import の指定子(静的な import 文と、文字列で書いた動的 import)
const valueImportsOf = (file, code) => {
  const kind = /\.[jt]sx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, kind)
  const found = []
  const visit = node => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      !isTypeOnlyImport(node.importClause)
    ) {
      found.push(node.moduleSpecifier.text)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      found.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

// 統合テストの中身の違反の理由(違反でなければ undefined)。container.browser.test.tsx が自分のコンテナを描くかを見る
const importViolationOf = (file, readCode) => {
  if (path.posix.basename(file) !== CONTAINER_TEST) return undefined
  return valueImportsOf(file, readCode()).includes('./container')
    ? undefined
    : REASON_NOT_OWN_CONTAINER
}

// コンテナの一覧のうち、container.tsx か container.browser.test.tsx が無いフォルダの違反(「パス: 理由」の並び)
const missingOf = (dirs, exists) =>
  dirs.flatMap(dir => [
    ...(exists(`${dir}/${CONTAINER}`) ? [] : [`${dir}/${CONTAINER}: ${REASON_NO_CONTAINER}`]),
    ...(exists(`${dir}/${CONTAINER_TEST}`)
      ? []
      : [`${dir}/${CONTAINER_TEST}: ${REASON_NO_CONTAINER_TEST}`]),
  ])

// ---- 自己検査 ----
// 違反と分かっている文字列とそうでない文字列を、実際の検査と同じ関数で判定し、期待と違えば落とす
const TEST_FILE_CASES = [
  ['src/a.test.ts', true],
  ['src/a.spec.tsx', true],
  ['src/a.browser.test.tsx', true],
  ['src/a.ts', false],
  ['src/a.test-helper.ts', false],
  ['src/a.test.ts.snap', false],
]
// [パス, 中身, 期待する理由]
const VIOLATION_CASES = [
  ['src/hooks/use-a.test.ts', '', REASON_HOOK_TEST],
  ['src/components/A/hooks/use-b/use-b.test.tsx', '', REASON_HOOK_TEST],
  ['src/components/A/hooks/container.browser.test.tsx', '', REASON_HOOK_TEST],
  ['src/hooks/use-a.ts', 'export const useA = () => 1', undefined],
  ['src/use-hooks/a.test.ts', '', undefined],
  ['src/a.test.tsx', 'const r = rtl.renderHook(() => useA())', REASON_RENDER_HOOK],
  ['src/a.test-helper.ts', 'export const r = () => renderHook(useA)', REASON_RENDER_HOOK],
  ['src/a.test.ts', `const r = load('https://example.com/', renderHook)`, REASON_RENDER_HOOK],
  ['src/a.test.ts', 'const a = 1 // renderHook を使わない', undefined],
  ['src/a.test.ts', '/*\n * renderHook を使わない\n */', undefined],
  ['src/a.test.ts', 'const renderHooked = 1', undefined],
]
// 置き場の判定に使う偽の作業ツリーとコンテナの一覧(B は container.tsx が無く、D は container.tsx があるが一覧の外)と、
// [パス, 期待する理由]
const FAKE_DIRS = ['src/components/A', 'src/components/B', 'src/components/C']
const FAKE_TREE = new Set([
  'src/components/A/container.tsx',
  'src/components/A/container.browser.test.tsx',
  'src/components/B/container.browser.test.tsx',
  'src/components/C/container.tsx',
  'src/components/D/container.tsx',
])
const PLACEMENT_CASES = [
  ['src/components/A/container.browser.test.tsx', undefined],
  ['src/components/A/container.tsx', undefined],
  ['src/components/A/index.tsx', undefined],
  ['src/components/A/utils/a.test.ts', undefined],
  ['src/components/B/container.browser.test.tsx', REASON_BROWSER_PLACE],
  ['src/components/D/container.browser.test.tsx', REASON_BROWSER_PLACE],
  ['src/components/A/index.browser.test.tsx', REASON_BROWSER_PLACE],
  ['src/components/A/container.browser.test.ts', REASON_BROWSER_PLACE],
  ['src/components/A/container.browser.spec.tsx', REASON_BROWSER_PLACE],
  ['src/components/A/components/X/container.browser.test.tsx', REASON_BROWSER_PLACE],
  ['src/utils/a.browser.test.ts', REASON_BROWSER_PLACE],
  ['src/components/D/container.tsx', REASON_CONTAINER_PLACE],
  ['src/components/A/components/X/container.tsx', REASON_CONTAINER_PLACE],
  ['src/components/A/container.ts', undefined],
]
// 一覧のうち container.tsx・container.browser.test.tsx が無いフォルダ(B はコンテナが、C は統合テストが無い)
const EXPECTED_MISSING = [
  `src/components/B/${CONTAINER}: ${REASON_NO_CONTAINER}`,
  `src/components/C/${CONTAINER_TEST}: ${REASON_NO_CONTAINER_TEST}`,
]
// [パス, 中身, 期待する理由]
const IMPORT_CASES = [
  [
    'src/components/A/container.browser.test.tsx',
    `import { render } from '@testing-library/react'\nimport { A } from './container'`,
    undefined,
  ],
  ['src/components/A/container.browser.test.tsx', `import A from './container'`, undefined],
  ['src/components/A/container.browser.test.tsx', `import * as A from './container'`, undefined],
  [
    'src/components/A/container.browser.test.tsx',
    `const { A } = await import('./container')`,
    undefined,
  ],
  [
    'src/components/A/container.browser.test.tsx',
    `import { type Props, A } from './container'`,
    undefined,
  ],
  [
    'src/components/A/container.browser.test.tsx',
    `import type { A } from './container'`,
    REASON_NOT_OWN_CONTAINER,
  ],
  [
    'src/components/A/container.browser.test.tsx',
    `import { type A } from './container'`,
    REASON_NOT_OWN_CONTAINER,
  ],
  [
    'src/components/A/container.browser.test.tsx',
    `import { A } from '@/components/A/container'`,
    REASON_NOT_OWN_CONTAINER,
  ],
  [
    'src/components/A/container.browser.test.tsx',
    `import { X } from './components/X/container'`,
    REASON_NOT_OWN_CONTAINER,
  ],
  [
    'src/components/A/container.browser.test.tsx',
    `// import { A } from './container'`,
    REASON_NOT_OWN_CONTAINER,
  ],
  [
    'src/components/A/container.browser.test.tsx',
    `const name = './container'`,
    REASON_NOT_OWN_CONTAINER,
  ],
  ['src/components/A/utils/a.test.ts', `import { a } from './a'`, undefined],
]
const fakeExists = p => FAKE_TREE.has(p)
const fakeMissing = missingOf(FAKE_DIRS, fakeExists)
const selfCheckFailures = [
  ...TEST_FILE_CASES.filter(([file, expected]) => TEST_FILE.test(file) !== expected).map(
    ([file, expected]) => `テストの名前の判定 ${file} → ${expected}`
  ),
  ...VIOLATION_CASES.filter(
    ([file, code, expected]) => violationOf(file, () => code) !== expected
  ).map(([file, code, expected]) => `違反の判定 ${file} ${JSON.stringify(code)} → ${expected}`),
  ...PLACEMENT_CASES.filter(
    ([file, expected]) => placementViolationOf(file, fakeExists, FAKE_DIRS) !== expected
  ).map(([file, expected]) => `置き場の判定 ${file} → ${expected}`),
  ...IMPORT_CASES.filter(
    ([file, code, expected]) => importViolationOf(file, () => code) !== expected
  ).map(([file, code, expected]) => `import の判定 ${file} ${JSON.stringify(code)} → ${expected}`),
  ...(JSON.stringify(fakeMissing) !== JSON.stringify(EXPECTED_MISSING)
    ? [`コンテナの一覧の空振りの判定 ${JSON.stringify(fakeMissing)}`]
    : []),
]
if (selfCheckFailures.length > 0) {
  throw new Error(`check-test-boundary: 自己検査に失敗: ${selfCheckFailures.join(', ')}`)
}

const codeFiles = (existsSync(SRC_DIR) ? walk(SRC_DIR) : [])
  .map(file => path.relative(ROOT, file).split(path.sep).join('/'))
  .filter(file => CODE_FILE.test(file))
  .sort()
const testCount = codeFiles.filter(file => TEST_FILE.test(file)).length
const codeFileSet = new Set(codeFiles)
const exists = file => codeFileSet.has(file)

// 1件も拾えないときは、違反が無いのではなく見る場所を間違えている
if (testCount === 0) {
  console.error('check-test-boundary: src にテストが1件も無い。対象の指定を疑うこと')
  process.exit(1)
}

// 1 ファイル 1 件で数える。hooks/ と renderHook の理由を先に出し、無ければ置き場、その次に中身の import を見る
const failures = [
  ...codeFiles.flatMap(file => {
    const readCode = () => readFileSync(path.join(ROOT, file), 'utf8')
    const reason =
      violationOf(file, readCode) ??
      placementViolationOf(file, exists, CONTAINER_DIRS) ??
      importViolationOf(file, readCode)
    return reason === undefined ? [] : [`${file}: ${reason}`]
  }),
  ...missingOf(CONTAINER_DIRS, exists),
]

if (failures.length > 0) {
  console.error(`check-test-boundary: ${failures.length} 件の違反`)
  for (const line of failures) console.error(`  - ${line}`)
  process.exit(1)
}

console.log(
  `check-test-boundary: コード ${codeFiles.length} 件・テスト ${testCount} 件とコンテナの一覧 ${CONTAINER_DIRS.length} か所 — 違反なし`
)
