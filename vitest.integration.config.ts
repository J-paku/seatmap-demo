import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { imageConfigDefault } from 'next/dist/shared/lib/image-config'
import { fileURLToPath, URL } from 'node:url'
import nextConfig from './next.config.mjs'

// 統合テスト(Vitest Browser Mode)の設定。コンテナ(scripts/container-dirs.mjs の一覧のフォルダの container.tsx)を、
// フック・子と一緒に実際の Chromium で、ビルド無しで描く。モックはネットワークと時間だけにし、
// localStorage は本物のブラウザの保存先をそのまま使う。
// 単体の vitest.config.ts と別のファイルにするのは、変異テスト(stryker.config.mjs)が vitest.config.ts を読むため。
// Stryker の Browser Mode 対応は未実測なので、変異テストは node の単体だけで回す。
// 単体の設定は src/**/*.test.ts だけを拾うので container.browser.test.tsx は入らず、ここは container.browser.test.tsx だけを拾う。
// ほかの名前の統合テストは、*.browser.test.tsx ならどちらの設定にも拾われず、*.browser.test.ts なら単体の設定が node で走らせる。
// どちらも npm run test:boundary(scripts/check-test-boundary.mjs)が落とすので、黙って残ることは無い。
//
// CSS は Vite がそのまま読む。*.module.css は CSS Modules、Tailwind はリポジトリ直下の postcss.config.mjs(Next のビルドと同じもの)を通る。
// Tailwind(@tailwindcss/postcss)はクラスを探す起点が process.cwd() なので、リポジトリ直下から走らせる(npm run の入口はそうなる)
export default defineConfig({
  // next/image は Next のビルドが process.env.__NEXT_IMAGE_OPTS を値へ置き換える前提で書かれていて、ブラウザには process が無い
  // (無いと読み込んだだけで ReferenceError: process is not defined。2026-10-16 の実測)。
  // 値は Next のビルドと同じ元(next/dist/build/define-env.js の getImageConfig: 既定値に next.config.mjs の images を重ねたもの)から作る。
  // 先に束ねた依存の中の process.env.X はこの置き換えを受けないが、Vite がブラウザで最初に読む /@vite/env が
  // define の値を globalThis.process.env へ書き、束の中の process.env.X が実行時にそれを読む
  define: {
    'process.env.__NEXT_IMAGE_OPTS': JSON.stringify({
      ...imageConfigDefault,
      ...nextConfig.images,
    }),
  },
  // 単体の vitest.config.ts と同じ alias(tsconfig.json の paths と同じもの)。無いと src の import が解決できない
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@mocks': fileURLToPath(new URL('./mocks', import.meta.url)),
    },
  },
  test: {
    // Testing Library の React は、afterEach・beforeAll が大域にあるときだけ、テストごとの片付け(cleanup)と
    // act の環境の設定を自分で掛ける(@testing-library/react の dist/index.js)。無いと前のテストの DOM が次のテストに残る
    globals: true,
    // 上の act の環境は、各テストの前にこの前準備が切る(実際のブラウザと本物のタイマーで動かすため。理由はそのファイル)
    setupFiles: ['./vitest.integration.setup.ts'],
    include: ['src/**/container.browser.test.tsx'],
    // 落ちた時の画面の写しと添付は、既定だとテストの隣(src の中)とリポジトリ直下に出る。
    // git が無視する test-results/ へ寄せる(下の browser.screenshotDirectory も)
    attachmentsDir: 'test-results/vitest-attachments',
    browser: {
      enabled: true,
      // 既定は process.env.CI なので、手元(WSL)で窓を開こうとしないよう明示する
      headless: true,
      // 時間帯は機器に左右させない。CI の機器(UTC)と同じにして、手元と CI で結果を揃える
      provider: playwright({ contextOptions: { timezoneId: 'UTC' } }),
      instances: [{ browser: 'chromium' }],
      // 画面寸法は E2E(playwright.config.ts)と同じ 1280×900。端の判定・空き位置の探索がこの寸法を前提にしている
      viewport: { width: 1280, height: 900 },
      screenshotDirectory: 'test-results/vitest-screenshots',
    },
    // 測るのは --coverage を付けたときだけ。単体の設定が外すフック(hooks/ 配下)もここでは測る。
    // 床はまだ掛けない(実測を取ってから掛ける)
    coverage: {
      provider: 'v8',
      enabled: false,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.fixture.ts', 'src/**/*.test-helper.ts'],
      reporter: ['text-summary'],
      reportsDirectory: 'coverage/integration',
    },
  },
})
