import { beforeEach } from 'vitest'

// 統合テスト(vitest.integration.config.ts の setupFiles)の前準備。React の act の環境
// (globalThis.IS_REACT_ACT_ENVIRONMENT)を各テストの前に切る。
//
// act は、テスト用の擬似 DOM でタイマー・Promise から来る更新を同期で流し切るための仕組みで、act の外で
// 起きた更新を「not wrapped in act(...)」と警告する。ここは実際の Chromium を本物のタイマーのまま動かす:
// モックの取得の遅れ(200〜500ms)・保存の遅れ・トーストが消える時間・ライブリージョンの遅れが、テストの
// 手順の合間やテストが終わった直後にも画面を更新する。断定は Testing Library の waitFor・findBy* が
// 画面に出るまで待つので、act で流し切る必要が無く、警告は手順の書き方によらず出続ける雑音にしかならない。
//
// Testing Library の React は読み込まれると beforeAll でこの値を true にする(@testing-library/react の
// dist/index.js)。beforeAll は beforeEach より先に回るので、ここでは beforeEach から false へ戻す。
// render・user-event の操作は Testing Library が act で包み、その間だけ値を true にして元へ戻す
// (dist/act-compat.js の withGlobalActEnvironment)ので、描画と操作の直後の更新はこれまでどおり流し切られる
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
})
