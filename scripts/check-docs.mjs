// 文書の自己整合性検査(node scripts/check-docs.mjs)。書いてある参照が実在するかだけを見る(内容の正しさは見ない)。
// J-paku.github.io の scripts/check-docs.mjs をこのリポジトリへ移したもの。
//
// 何を確かめるか:
//   1. 相対リンク — [表示](path) の path が実在するファイル・フォルダか
//   2. 参照パス   — コードスパン `src/...` `scripts/...` などが実在するか。`path:12-34`・`path:名前` の後ろは外して見る
//   3. コマンド   — `npm run xxx` の xxx が package.json の scripts にあるか
//   4. 孤児       — docs/ の文書が、ほかのどの文書からも指されていないか
//   5. E2E 一覧   — docs/agents/verification.md の「## E2E のN本」と tests/**/*.spec.ts の実物が一致するか
//
// J-paku との違い:
//   - frontmatter は見ない。このリポジトリの文書は「# 名前 — 説明」の見出しで始める慣例で、frontmatter を持たない
//   - docs/conventions/ のコードスパンは見ない。利用者のローカル規約の写しで、例示のパスはこのリポジトリのものではない
//     (リンクは見る)
//   - 文書は参照をリンクよりコードスパンで書くことが多いので、孤児の判定ではコードスパンで指したものも数える
//
// 実在の判定は「作業ツリーにあるか」ではなく「git が追跡しているか」で行う(index に載せた新しいファイルも含む)。
// 開発機にしか無いもの(.gitignore 済みの出力、リポジトリの外)を実在と数えると、手元だけ通って CI で落ちる。
//
// 判定の正規表現や分岐が壊れると、参照を1件も拾わずに「不整合なし」で通ってしまう。そこで走るたびに最初に、
// 壊れた参照と正しい参照を混ぜた架空の文書を実際の検査と同じ関数に通し、期待どおりの不整合だけが出るかを確かめる
// (下の「自己検査」。scripts/gate-targets.mjs・scripts/check-test-boundary.mjs と同じ作り)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// cwd に依存しない。どこから呼んでもリポジトリ直下を見る
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// 検査対象の文書。リポジトリ直下の3つ + 下のフォルダの .md すべて
const ENTRY_FILES = ['AGENTS.md', 'CLAUDE.md', 'README.md']
const SCAN_DIRS = ['docs', 'src', 'scripts', 'tests', 'mocks']
const WALK_SKIP = new Set(['node_modules', '.git'])
// .gitignore 済みの出力の置き場。書いてあっても実在を確かめる手段が無いので検査しない
const UNTRACKED_TOP = new Set([
  'node_modules',
  '.git',
  '.next',
  'out',
  'build',
  'coverage',
  'reports',
  '.stryker-tmp',
  'test-results',
  'playwright-report',
  'blob-report',
  '.lighthouseci',
])
// コードスパンの参照パスを見ない文書の置き場(理由は冒頭)
const PATHS_UNCHECKED = ['docs/conventions/']
const E2E_LIST_DOC = 'docs/agents/verification.md'
// Playwright の testDir は tests なので、入れ子のフォルダの spec も走る。深さを問わず拾う
const SPEC_PATTERN = /^tests\/(?:[^/]+\/)*[^/]+\.spec\.ts$/

const LINK = /\[[^\]]*\]\(((?:[^()\s]|\([^()]*\))+)(?:\s+"[^"]*")?\)/g
const CODE_SPAN = /`([^`\n]+)`/g
const NPM_RUN = /npm run ([\w:.-]+)/g
const EXTENSIONS = 'ts|tsx|mjs|js|cjs|css|md|json|html|yml|yaml|png|svg|sh'
// 拡張子の後ろの `:12-34`・`:名前`・`#見出し` は外して、ファイルの実在だけを見る
const PATH_WITH_SUFFIX = new RegExp(`^(.+\\.(?:${EXTENSIONS}))(?:[:#][^\\s/]*)?$`)

const toPosix = p => p.split(path.sep).join('/')
const lineOf = (raw, index) => raw.slice(0, index).split('\n').length
// フェンスドコードブロックは行数を保ったまま伏せる(中の例示を参照として扱わないため)
const maskFences = raw => raw.replace(/```[\s\S]*?```/g, block => block.replace(/[^\n]/g, ' '))

const isUncheckable = relative =>
  relative.startsWith('..') ||
  path.isAbsolute(relative) ||
  UNTRACKED_TOP.has(relative.split('/')[0])

// コードスパンの中身を、リポジトリ相対の参照パスへ直す。参照パスとみなさないものは undefined。
// 条件は「/ を含み、末尾が / か拡張子」。URL・絶対パス・ホーム(~)・glob・プレースホルダ・空白入りは外す
const toPathRef = value => {
  if (/^(?:\/|#|~)/.test(value) || value.includes('://')) return undefined
  if (/[{}*<>,\s|]/.test(value) || !value.includes('/')) return undefined
  const resolved = value.startsWith('@/')
    ? `src/${value.slice(2)}`
    : value.startsWith('@mocks/')
      ? `mocks/${value.slice(7)}`
      : value
  if (resolved.endsWith('/')) return resolved
  return PATH_WITH_SUFFIX.exec(resolved)?.[1]
}

// 1文書の検査。exists はリポジトリ相対のパスが実在するか、scripts は package.json の scripts。
// 不整合の一覧と、その文書が指した実在のパス(孤児の判定に使う)を返す
const checkDoc = (file, raw, { exists, scripts }) => {
  const failures = []
  const pointed = new Set()
  const fail = (index, message) => failures.push(`${file}:${lineOf(raw, index)}: ${message}`)
  const dir = path.posix.dirname(file)
  const masked = maskFences(raw)

  for (const match of masked.matchAll(LINK)) {
    const target = match[1].split('#')[0]
    if (target === '' || target.includes('://') || target.startsWith('mailto:')) continue
    const relative = path.posix.normalize(path.posix.join(dir, target))
    if (isUncheckable(relative)) continue
    if (exists(relative)) pointed.add(relative.replace(/\/$/, ''))
    else fail(match.index, `リンク先が無い: ${match[1]}`)
  }

  if (!PATHS_UNCHECKED.some(prefix => file.startsWith(prefix))) {
    for (const match of masked.matchAll(CODE_SPAN)) {
      const ref = toPathRef(match[1].trim())
      if (ref === undefined || isUncheckable(ref)) continue
      // リポジトリ直下からと、その文書の位置からの両方で探す
      const fromDoc = path.posix.normalize(path.posix.join(dir, ref))
      const found = [ref, fromDoc].find(candidate => !isUncheckable(candidate) && exists(candidate))
      if (found !== undefined) pointed.add(found.replace(/\/$/, ''))
      else fail(match.index, `参照パスが無い: ${match[1].trim()}`)
    }
  }

  for (const match of raw.matchAll(NPM_RUN)) {
    if (scripts[match[1]] === undefined)
      fail(match.index, `package.json に無いコマンド: npm run ${match[1]}`)
  }
  return { failures, pointed }
}

// docs/ の文書のうち、自分以外のどの文書からも指されていないもの
const findOrphans = pointedByFile =>
  [...pointedByFile.keys()].filter(
    file =>
      file.startsWith('docs/') &&
      ![...pointedByFile].some(([other, pointed]) => other !== file && pointed.has(file))
  )

// E2E の一覧と実物の突き合わせ。spec を足しても消しても文書が追随しないと、表に無い spec は
// 「走っているのに誰も知らない検査」、表にしか無い spec は「もう走らない検査」になる。見出しの本数も数える
const checkE2eList = (file, raw, actualSpecs) => {
  const heading = /^## E2E の(\d+)本 *$/m.exec(raw)
  if (heading === null)
    return [`${file}:1: 「## E2E のN本」の見出しが無い。E2E 一覧を突き合わせられない`]
  const at = `${file}:${lineOf(raw, heading.index)}`
  // 見出しから次の同じ階層の見出しまでが一覧の範囲
  const section = raw.slice(heading.index + heading[0].length).split(/\n## [^#]/)[0]
  const listed = [...new Set([...section.matchAll(/`(tests\/[^`\n]+\.spec\.ts)`/g)].map(m => m[1]))]
  return [
    ...actualSpecs
      .filter(spec => !listed.includes(spec))
      .map(spec => `${at}: 一覧に無い spec: ${spec}`),
    ...listed
      .filter(spec => !actualSpecs.includes(spec))
      .map(spec => `${at}: 一覧にあるが実在しない spec: ${spec}`),
    ...(Number(heading[1]) === actualSpecs.length
      ? []
      : [
          `${at}: 見出しの本数が実際と違う: ${heading[1]}本 と書いてあるが ${actualSpecs.length}本`,
        ]),
  ]
}

// ---- 自己検査 ----
// 壊れた参照と正しい参照を混ぜた架空の文書を通し、出た不整合が期待と1件でも違えば落とす
const selfTest = () => {
  const tracked = new Set(['docs/b.md', 'src', 'src/x.ts', 'mocks/m.json'])
  const env = {
    exists: relative => tracked.has(relative.replace(/\/$/, '')),
    scripts: { ok: 'x', build: 'x' },
  }
  const doc = [
    '[ある](b.md) [見出し付き](b.md#節) [外](https://example.com) [無い](missing.md)',
    '`src/x.ts` `src/x.ts:12-34` `src/x.ts:名前` `@/x.ts` `@mocks/m.json` `src/` `src/y.ts`',
    '`~/outside/z.md` `out/index.html` `src/**/*.ts` `npm run build && x` `/mnt/c/x.ts` `a/b`',
    'npm run ok と npm run nope',
    '```',
    '[囲みの中](fenced-missing.md) `src/fenced-missing.ts`',
    '```',
  ].join('\n')
  const main = checkDoc('docs/a.md', doc, env)
  const convention = checkDoc('docs/conventions/c.md', '`src/y.ts` [無い](missing.md)', env)
  const e2e = checkE2eList(
    'docs/e.md',
    '## E2E の3本\n\n- `tests/a.spec.ts`\n- `tests/gone.spec.ts`\n\n## 次\n\n- `tests/b.spec.ts`\n',
    ['tests/a.spec.ts', 'tests/b.spec.ts']
  )
  const orphans = findOrphans(
    new Map([
      ['docs/a.md', new Set(['docs/b.md'])],
      ['docs/b.md', new Set(['docs/b.md'])],
      ['docs/c.md', new Set(['docs/c.md'])],
      ['README.md', new Set()],
    ])
  )
  const got = [...main.failures, ...convention.failures, ...e2e, ...orphans.map(o => `孤児 ${o}`)]
  const expected = [
    'docs/a.md:1: リンク先が無い: missing.md',
    'docs/a.md:2: 参照パスが無い: src/y.ts',
    'docs/a.md:4: package.json に無いコマンド: npm run nope',
    'docs/conventions/c.md:1: リンク先が無い: missing.md',
    'docs/e.md:1: 一覧に無い spec: tests/b.spec.ts',
    'docs/e.md:1: 一覧にあるが実在しない spec: tests/gone.spec.ts',
    'docs/e.md:1: 見出しの本数が実際と違う: 3本 と書いてあるが 2本',
    '孤児 docs/a.md',
    '孤児 docs/c.md',
  ]
  // 正しい参照を実在として数えているか(孤児の判定がこれに頼る)
  const pointedOk = ['docs/b.md', 'src/x.ts', 'mocks/m.json', 'src'].every(p => main.pointed.has(p))
  if (JSON.stringify(got) !== JSON.stringify(expected) || !pointedOk) {
    console.error('check-docs: 自己検査に失敗。判定の正規表現か分岐が壊れている')
    console.error(`  期待: ${JSON.stringify(expected, null, 2)}`)
    console.error(`  実際: ${JSON.stringify(got, null, 2)}`)
    console.error(`  正しい参照を実在と数えたか: ${pointedOk}`)
    process.exit(1)
  }
}

selfTest()

// ---- 本番の検査 ----

// 壊れたシンボリックリンクで statSync が例外を投げないよう、実体の無い入口は集める前に落とす
const walk = dir =>
  readdirSync(dir).flatMap(name => {
    if (WALK_SKIP.has(name)) return []
    const p = path.join(dir, name)
    const stat = statSync(p, { throwIfNoEntry: false })
    if (stat === undefined) return []
    return stat.isDirectory() ? walk(p) : [p]
  })

// ENTRY_FILES と SCAN_DIRS は重なりうるので、同じ文書を二重に数えないよう Set で畳む
const docFiles = [
  ...new Set([
    ...ENTRY_FILES.filter(rel => existsSync(path.join(ROOT, rel))),
    ...SCAN_DIRS.filter(dir => existsSync(path.join(ROOT, dir)))
      .flatMap(dir => walk(path.join(ROOT, dir)))
      .filter(p => p.endsWith('.md'))
      .map(p => toPosix(path.relative(ROOT, p))),
  ]),
]

// git が追跡しているパスの集合。CI のチェックアウトに実在するものと一致する
const trackedFiles = new Set(
  execFileSync('git', ['-C', ROOT, 'ls-files', '-z'], { encoding: 'utf-8' })
    .split('\0')
    .filter(line => line !== '')
)
const trackedDirs = new Set(
  [...trackedFiles].flatMap(file =>
    file
      .split('/')
      .slice(0, -1)
      .map((_, i, parts) => parts.slice(0, i + 1).join('/'))
  )
)
const env = {
  exists: relative => {
    const normalized = relative.replace(/\/$/, '')
    return trackedFiles.has(normalized) || trackedDirs.has(normalized)
  },
  scripts: JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf-8')).scripts,
}

const failures = []
const pointedByFile = new Map()
for (const file of docFiles) {
  // CRLF のままだと行の判定がずれる
  const raw = readFileSync(path.join(ROOT, file), 'utf-8').replace(/\r\n/g, '\n')
  const result = checkDoc(file, raw, env)
  failures.push(...result.failures)
  pointedByFile.set(file, result.pointed)
}
failures.push(...findOrphans(pointedByFile).map(file => `${file}:1: どこからも指されていない`))

// 文書ごと消えた・移された場合は突き合わせが丸ごと黙って飛ぶ。飛んだことに気づけるよう落とす
const actualSpecs = [...trackedFiles].filter(file => SPEC_PATTERN.test(file)).sort()
if (!docFiles.includes(E2E_LIST_DOC)) {
  failures.push(`${E2E_LIST_DOC}:1: この文書が無い。E2E 一覧の突き合わせが成立していない`)
} else {
  const raw = readFileSync(path.join(ROOT, E2E_LIST_DOC), 'utf-8').replace(/\r\n/g, '\n')
  failures.push(...checkE2eList(E2E_LIST_DOC, raw, actualSpecs))
}
if (actualSpecs.length === 0)
  failures.push(`${E2E_LIST_DOC}:1: tests/**/*.spec.ts が1件も無い。突き合わせが成立していない`)

const pointedCount = [...pointedByFile.values()].reduce((sum, set) => sum + set.size, 0)
if (docFiles.length === 0 || pointedCount === 0) {
  console.error('check-docs: 検査対象の文書か、実在を確かめた参照が1件も無い。対象の指定を疑うこと')
  process.exit(1)
}

if (failures.length > 0) {
  console.error(`check-docs: ${failures.length} 件の不整合`)
  for (const line of failures) console.error(`  - ${line}`)
  process.exit(1)
}

console.log(
  `check-docs: ${docFiles.length} 件の文書・実在を確かめた参照先 ${pointedCount} 件 — 不整合なし`
)
