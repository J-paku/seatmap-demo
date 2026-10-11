import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'
import { COVERAGE_TARGETS } from './scripts/gate-targets.mjs'

// 1ファイルを文・分岐・関数・行のすべてで100%に固定するしきい値(glob ごとのしきい値では `100: true` と同じ意味)
const FULL_COVERAGE = { statements: 100, branches: 100, functions: 100, lines: 100 }

// 純粋モジュールはファイルごとに100%で固定する。人がコードを読まない代わりに、テストが一度も通らない行・分岐を残さない。
// 対象は一覧を手で並べず、scripts/gate-targets.mjs の COVERAGE_TARGETS(純粋モジュールの置き場の全部)を使う。
// 新しい純粋モジュールは置いた時点で対象になる。名指しで外したパスが実在しないときは、gate-targets.mjs を読み込む時点で落ちる

// src の import はツリーを跨ぐと `@/`、モックの JSON は `@mocks` の alias で書く(docs/structure.md 3.)。
// テストもその import を通るので、tsconfig.json の paths と同じ alias をここにも張る(無いとテストが全滅する)
// npm の scripts は `vitest run` の単発実行だけを置く。/mnt/c にあった頃は inotify が効かず watch モードが
// 使えなかったが、2026-10-12 に Linux 側のディスクへ移したのでその制約は無い(docs/decisions/0001-linux-disk-and-src.md)
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@mocks': fileURLToPath(new URL('./mocks', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // src/lib・src/utils に加え、コンポーネント専用の utils/ のテストも走らせる
    include: ['src/**/*.test.ts'],
    // 測るのは --coverage を付けたときだけ。--coverage の無い vitest run は今までどおり速く回す
    coverage: {
      provider: 'v8',
      enabled: false,
      include: ['src/**/*.{ts,tsx}'],
      // hooks/ 配下は単体テストを置かない層なので測らない。フックの動きは E2E が見る
      // (hooks/ にテストを置いていないかは scripts/check-test-boundary.mjs が検査する)
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.fixture.ts',
        'src/**/*.test-helper.ts',
        'src/**/hooks/**',
      ],
      reporter: ['text-summary', 'json-summary'],
      reportsDirectory: 'coverage',
      // 2026-10-12の実測(statements 53.71%・branches 37.05%・functions 45.39%・lines 51.57%)から2pt引いて切り捨てた値。
      // 目標値ではなく、テストを消したり使われないコードを増やしたりしたときに落とすための床
      thresholds: {
        statements: 51,
        branches: 35,
        functions: 43,
        lines: 49,
        // ファイル別100%(一覧は scripts/gate-targets.mjs の COVERAGE_TARGETS)
        ...Object.fromEntries(COVERAGE_TARGETS.map(file => [file, FULL_COVERAGE])),
      },
    },
  },
})
