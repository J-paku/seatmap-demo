// コンテナ(container.tsx)を置くフォルダの一覧の正本。scripts/check-test-boundary.mjs が使う。
// コンテナは画面の状態・データのフックを呼んで表示部品へ渡す画面の入口で、統合テスト(vitest.integration.config.ts)が
// 実際の Chromium で描く単位になる。一覧のフォルダには container.tsx と、その隣の container.browser.test.tsx が1本ずつ要る。
// 名前が container.tsx でも、この一覧の外に置いたものはコンテナに数えない(check-test-boundary.mjs が落とす)。
// コンテナを足す・移すときは、この一覧を直す。
// パスはリポジトリ直下からの '/' 区切りで、末尾に '/' を付けない。
//
// 使い方: import { CONTAINER_DIRS } from './container-dirs.mjs'

export const CONTAINER_DIRS = ['src/components/SeatMapView']
