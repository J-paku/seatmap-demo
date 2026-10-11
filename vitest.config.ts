import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

// src の import はツリーを跨ぐと `@/`、モックの JSON は `@mocks` の alias で書く(docs/structure.md 3.)。
// テストもその import を通るので、tsconfig.json の paths と同じ alias をここにも張る(無いとテストが全滅する)
// watch モードは使わない: このリポジトリは /mnt/c 上にあり inotify が効かない
// (ファイル変更に対しイベント0件を実測済み)ため、`vitest run` の単発実行のみを想定する
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
      // 2026-10-12の実測(statements 43.82%・branches 30.11%・functions 36.54%・lines 41.93%)から2pt引いて切り捨てた値。
      // 目標値ではなく、テストを消したり使われないコードを増やしたりしたときに落とすための床
      thresholds: {
        statements: 41,
        branches: 28,
        functions: 34,
        lines: 39,
      },
    },
  },
})
