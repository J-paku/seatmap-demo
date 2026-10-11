import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

// utils/lib 内部の import は `@/` alias を31件以上使用しており、
// 未設定だとテストが全滅するため必須で設定する
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
    include: ['src/utils/**/*.test.ts', 'src/lib/**/*.test.ts'],
  },
})
