// 変異テスト(Stryker)の設定。純粋モジュールは人がコードを読まない代わりに、元のコードを1か所ずつ壊した変異体を
// テストが1体残らず見抜けることを機械に確かめさせる。生き残りは「テストが見ていない振る舞い」なので、1体でも残れば落とす。
// 対象は scripts/gate-targets.mjs の MUTATION_TARGETS(読み込むたびに src をたどって選ぶ。一覧を手で並べない)。
// 読み込む時に投げる変異体(トップレベルの検査や定数の組み立てを壊したもの)はテストの import が失敗して Survived と
// 数えられるので、そういうモジュールのテストは vi.resetModules() の後に await import(...) で読み込む
import { MUTATION_TARGETS } from './scripts/gate-targets.mjs'

const config = {
  testRunner: 'vitest',
  vitest: { configFile: 'vitest.config.ts' },
  // 変異体ごとに、その箇所を通るテストだけを走らせる
  coverageAnalysis: 'perTest',
  mutate: MUTATION_TARGETS,
  thresholds: { high: 100, low: 100, break: 100 },
  reporters: ['clear-text', 'progress', 'html'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  // 前回の結果を残し、変わった変異体だけを走らせる。全部を走らせるときは --force。
  // 穴: mutate のファイルとテストしか比べないので、依存・設定・import 先だけが変わっても前回の結果を使い回す
  incremental: true,
  incrementalFile: 'reports/stryker-incremental.json',
  tempDirName: '.stryker-tmp',
  // 作業用の写しを作るとき .gitignore を読まないので、手元にしか無い大きなフォルダはここで外す
  ignorePatterns: [
    '/.claude',
    '/.next',
    '/out',
    '/coverage',
    '/test-results',
    '/playwright-report',
    '/reports',
    '/.lighthouseci',
  ],
}

export default config
