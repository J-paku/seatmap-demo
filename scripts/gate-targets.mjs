// 変異テスト100%(stryker.config.mjs の mutate)とファイル別カバレッジ100%(vitest.config.ts)の対象の正本。
// 一覧を手で並べると、新しいファイルを足し忘れたときに黙って門の外へ出る。そこで読み込むたびに src をたどり、
// 純粋モジュールの置き場の .ts を規則で選ぶ。lib/ は外との入出力の置き場だが、利用者の方針で utils/ と同じく門に入れる。
//   含める: src/lib/**/*.ts・src/utils/**/*.ts・src/components/**/utils/**/*.ts
//   外す:   *.test.ts・*.d.ts・*.fixture.ts・*.test-helper.ts・hooks/ の下(単体テストを置かない層)
//   名指し: COVERAGE_ONLY は変異テストから外し、ファイル別100%だけで固める
// 名指しの空振り・規則やたどり方の故障で対象が黙って変わらないよう、読み込む時点で確かめて落とす(下の「自己検査」)。
// 返すパスはリポジトリ直下からの '/' 区切りで、並べ替え済み
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// cwd に依存しない。どこから呼んでもリポジトリ直下を見る(Stryker の作業用の写しの中でも、写しの直下を見る)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(ROOT, 'src')
const SKIP_DIRS = new Set(['node_modules', '.git'])

const IN_PURE_DIR = /^src\/(?:lib|utils)\/.+\.ts$|^src\/components\/(?:.+\/)?utils\/.+\.ts$/
const NOT_MODULE = /\.(?:test|d|fixture|test-helper)\.ts$|(?:^|\/)hooks\//

// データ(絵の行列・値の表など)だけのファイルを置く。値を1つ変えた変異体を見抜くには表を丸ごと写したテストが
// 要るだけで、振る舞いは守れないため。足すときは、何のデータか・実測で何体生き残ったかをパスの上に書く
const COVERAGE_ONLY = []

// ---- 自己検査 ----
// 1件以上拾えている限り門は通ってしまうので、規則の故障で対象が大きく減っても気付けない
// (例: コンポーネントの utils の項を消すと22ファイルが門の外へ出る)。そこで次の3つを確かめる

// 1. 規則の各項に当たる架空のパスの判定(規則そのものの書き換えを見る)
const RULE_CASES = [
  ['src/lib/a.ts', true],
  ['src/lib/x/a.ts', true],
  ['src/utils/x/a.ts', true],
  ['src/components/A/utils/a.ts', true],
  ['src/components/A/B/utils/x/a.ts', true],
  // 外す名前はフォルダ名・ファイル名の全体で見る
  ['src/lib/use-hooks/a.ts', true],
  ['src/lib/a.tsx', false],
  ['src/components/A/a.ts', false],
  ['src/hooks/use-a.ts', false],
  ['src/lib/a.test.ts', false],
  ['src/lib/a.d.ts', false],
  ['src/lib/a.fixture.ts', false],
  ['src/lib/a.test-helper.ts', false],
  ['src/components/A/hooks/utils/a.ts', false],
]

// 2. 実在するファイルの判定(src のたどり方まで見る)。実在しないと落とす
const MUST_INCLUDE = [
  'src/lib/fetch-mock.ts',
  'src/lib/garoon/facilities.ts',
  'src/utils/presence.ts',
  'src/utils/avatar/matrices/compose.ts',
  'src/components/SeatMapCanvas/utils/gesture-math.ts',
]
const MUST_EXCLUDE = [
  'src/lib/fetch-mock.test.ts',
  'src/hooks/use-long-press.ts',
  'src/components/SeatMapCanvas/hooks/use-viewport.ts',
]

// 3. 置き場ごとの件数の下限。2026-10-12 の実測 lib 10・utils 60・components 22 の80%を切り捨てた値。
// 目標ではなく、規則やたどり方が壊れて大きく減ったときに落とすための床
const FLOORS = [
  ['src/lib/', 8],
  ['src/utils/', 48],
  ['src/components/', 17],
]

const failSelfCheck = (what, items) => {
  if (items.length > 0) {
    throw new Error(`scripts/gate-targets.mjs: 自己検査に失敗(${what}): ${items.join(', ')}`)
  }
}

failSelfCheck(
  '名指ししたパスが実在しない',
  [...COVERAGE_ONLY, ...MUST_INCLUDE, ...MUST_EXCLUDE].filter(
    file => !existsSync(path.join(ROOT, file))
  )
)

// 壊れたシンボリックリンクで statSync が例外を投げないよう、実体の無い入口は集める前に落とす
const walk = dir =>
  readdirSync(dir).flatMap(name => {
    if (SKIP_DIRS.has(name)) return []
    const p = path.join(dir, name)
    const stat = statSync(p, { throwIfNoEntry: false })
    if (stat === undefined) return []
    return stat.isDirectory() ? walk(p) : [p]
  })

const named = new Set(COVERAGE_ONLY)
const isMutationTarget = file =>
  IN_PURE_DIR.test(file) && !NOT_MODULE.test(file) && !named.has(file)

failSelfCheck(
  '規則の判定が期待と違うパス → 期待',
  RULE_CASES.filter(([file, expected]) => isMutationTarget(file) !== expected).map(
    ([file, expected]) => `${file} → ${expected}`
  )
)

const SRC_FILES = walk(SRC_DIR).map(file => path.relative(ROOT, file).split(path.sep).join('/'))

export const MUTATION_TARGETS = SRC_FILES.filter(isMutationTarget).sort()
export const COVERAGE_TARGETS = [...MUTATION_TARGETS, ...COVERAGE_ONLY].sort()

failSelfCheck(
  '変異テストの対象に入っていない',
  MUST_INCLUDE.filter(file => !MUTATION_TARGETS.includes(file))
)
failSelfCheck(
  '門の対象から外れていない',
  MUST_EXCLUDE.filter(file => COVERAGE_TARGETS.includes(file))
)
failSelfCheck(
  '置き場の件数が下限を割った 置き場 件数 < 下限',
  FLOORS.flatMap(([dir, floor]) => {
    const count = MUTATION_TARGETS.filter(file => file.startsWith(dir)).length
    return count < floor ? [`${dir} ${count} < ${floor}`] : []
  })
)
