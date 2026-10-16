# verification.md — 何を走らせるか・いつ「完了」と言えるか

**変更を確かめる前と、「完了」と報告する前に読む。** コマンドの中身の正本は `package.json` の `scripts`。
なぜこの門なのかは [../decisions/0004-extreme-constraints.md](../decisions/0004-extreme-constraints.md)、
E2E を置いた経緯は [../decisions/0003-playwright-e2e.md](../decisions/0003-playwright-e2e.md)、
統合テストを置いた経緯は [../decisions/0007-browser-integration-containers.md](../decisions/0007-browser-integration-containers.md)。
検証の一般原則(実測の義務・PASS の疑い方・報告の形)は `docs/conventions/02-verifying.md`。

## 変えたもの → 走らせるもの

**狭いものから。** 反復中は表の行だけを走らせ、全体は commit・push の前にまとめて1回。

| 変えたもの | 走らせるもの |
|---|---|
| 純粋モジュール(`src/lib/`・`src/utils/`・コンポーネントの `utils`)。対象の正本は `scripts/gate-targets.mjs` | 隣の `*.test.ts`(`npx vitest run <ファイル>`) → `npm run typecheck` → `npm run test:coverage` → `npm run test:mutation` |
| `hooks` フォルダの下のファイルを足す・移す | `npm run test:boundary` → そのフックを使うコンテナの統合テスト(あれば。下の「統合テスト」) → その画面に関わる E2E の spec |
| コンポーネント・フック(画面の振る舞い) | `npm run typecheck` → `npm run lint` → 関わるコンテナの統合テスト(あれば) → `npm run build` → 関わる E2E の spec |
| コンテナ(`container.tsx`)・統合テスト(`container.browser.test.tsx`)・コンテナの一覧(`scripts/container-dirs.mjs`) | `npm run test:boundary` → その統合テスト(下の「統合テスト」) |
| 画面へ注入する判定(`scripts/verify-*.js`) | `npm run build` → それを注入する spec(下の「E2E の3本」) |
| E2E(`tests/`) | `npm run build` → その spec。新しい判定は一度わざと落として検出力を見てから採る |
| CSS・色 | `npm run build` → 関わる E2E → 見た目は目で確かめる(規則は `docs/styling.md`) |
| モック(`mocks/`) | `node scripts/verify-schedule-facility.mjs` → `npm run test` → `npm run build` → E2E 全体 |
| `lighthouserc.json` | `docs/quality/performance.md` の「手元で測る」 |
| 設定(`next.config.mjs` / `tsconfig.json` / `eslint.config.mjs` / `playwright.config.ts`) | `npm run verify` → `npm run test:e2e` |
| `vitest.config.ts` / `stryker.config.mjs` / `scripts/gate-targets.mjs` | `npm run verify` → `npm run test:mutation -- --force` |
| `vitest.integration.config.ts` | `npm run test:integration` → `npm run verify` |
| 依存の版(`package.json` / `package-lock.json`) | `npm run verify` → `npm run test:mutation -- --force` → `npm run test:e2e` |
| `.github/workflows/` | 手元で CI と同じ順に: `npm run verify` → `npm run test:mutation` → `npm run test:e2e` |
| 文書(`docs/`・`*.md`) | `npm run docs:check` |

## 変異テストの走らせ方

- 既定は `npm run test:mutation`。前回の結果(`stryker.config.mjs` の `incrementalFile`)を引き継ぎ、変わった変異体だけを走らせる
- 引き継ぎは対象のファイルとそのテストしか比べない。変えたファイルを別の純粋モジュールが import しているとき、
  依存・設定を変えたときは `npm run test:mutation -- --force` で全部を走らせる
- 全体(`--force`)は**週1回**、手で走らせる。CI の定期実行は置いていない。2026-10-12 の全体は5分19秒
- 必ず検査したいチェックアウト(または worktree)の直下で走らせる。Stryker は現在のフォルダを基準に動く(`docs/pitfalls.md`)
- commit の前に git のフックで走らせることはしない

## commit・push の前

1. `npm run verify` を1回通す。中身は docs:check → lint → typecheck → format:check → test:coverage → test:boundary → test:integration →
   knip → build の直列で、前段が落ちたら後段は走らない(統合テストの全体はここで1回走る)
2. 純粋モジュールかそのテストを変えたなら `npm run test:mutation`(生き残り0)
3. 画面に関わる変更なら、`npm run build` の後に `npm run test:e2e` の全体を1回
4. 文書を変えたなら `npm run docs:check`

## 完了の条件

次を**全部**満たして初めて「完了」と言う。ローカルの PASS だけで完了と言わない。

1. 上の「commit・push の前」が全部通った(実際に走らせた出力を見た)
2. push の後、CI(`.github/workflows/ci.yml`。verify のジョブと knip のジョブ)が全部緑
3. 配信(`.github/workflows/deploy-pages.yml`)の後、配信版に対して E2E が通った。配信は main への push の ci が成功した後に走り、
   その ci が検査したコミットを配る(ci が落ちれば配信されない。手で配り直す `workflow_dispatch` だけは ci の結果を見ない):

   ```bash
   E2E_BASE_URL=https://j-paku.github.io/seatmap-demo/ npx playwright test
   ```

走らせられなかった検証は、何を確かめていないかを報告に書く。
他のエージェント・ワーカーの「直した」は、ファイルか diff を自分で見るまで根拠にしない。

## 統合テスト

正本は `vitest.integration.config.ts` と、コンテナを置くフォルダの一覧 `scripts/container-dirs.mjs`。
コンテナ(一覧のフォルダの `container.tsx`)を、フック・子と一緒に実際の Chromium(headless)で描く。ビルドは要らない。
拾うのは `src/**/container.browser.test.tsx` だけで、コンテナごとに1本(置き場の違反は `npm run test:boundary` が落とす)。

書くときの約束:

- 実際の Chromium で、ビルド無しで描く。モックはネットワークと時間だけで、モジュールは差し替えない
- `localStorage` は本物の保存先を使う。別のタブが保存した状態・保存先が一杯の状態も、本物の保存先に書いて作る
- 断定は利用者に見えるもの(role・名前・文字・`aria-*`)と、固定の DOM フック(`CLAUDE.md` の不変ルール4)で行う
- Next のルーターは、Next の本物の `RouterContext` に値を渡す(モジュールのモックにしない)。SWR の覚え(キャッシュ)はテストごとに
  新しい `Map` にする(新しくページを開いたのと同じ)
- 環境は画面寸法 1280×900(E2E と同じ)・ブラウザの時間帯 UTC(CI の機器と同じ)に固定してある

```bash
npm run test:integration                                       # 全体。commit の前に1回(npm run verify にも入っている)
npm run test:integration -- src/components/SeatMapView/container.browser.test.tsx -t '最初の表示'   # 反復中はファイルと名前で絞る
npm run test:integration -- --coverage                         # カバレッジ(報告は coverage/integration。下限はまだ無い)
```

- 反復中は全体を回さない。落ちたファイル・新しく書いたテストだけをファイルと `-t` で絞り、全体は commit の前に1回だけ
- ブラウザは E2E と同じ `~/.cache/ms-playwright` の Chromium を使う(入れ方の注意は下の「E2E の3本」の最後)

## E2E の3本

正本は `tests/` と `playwright.config.ts`。判定の本体は `scripts/verify-*.js` にあり、spec は画面状態を作って注入し、結果を断言する。

| spec | 見るもの | 注入する判定 | 判定数 |
|---|---|---|---|
| `tests/edit-anchors.spec.ts` | 5つの画面状態(閲覧・編集セッション中・ゴースト配置中・オーバーレイ・オーバーレイ編集中)の編集アンカーと、うち3状態のキャンバス不変条件 | `scripts/verify-edit-anchors.js`・`scripts/verify-s1.js` | 60 |
| `tests/ghost-placement.spec.ts` | ゴースト配置の3シナリオ(新規配置・掴み直し・配置中の終了)と、どの局面でも実測されなかった skip の消し込み。このファイルだけ serial | `scripts/verify-ghost.js` | 361 |
| `tests/offscreen-indicator.spec.ts` | 全チームが画面外のときだけ端に出る「チームへ移動」ボタン | spec 自身の判定 | 18 |

判定数は移す前の運転台と同じ数(2026-10-12)。共通の手順は `tests/seatmap.helpers.ts`・`tests/ghost.helpers.ts`、
配信物の照合は `tests/global-setup.ts`。

```bash
npm run build                                                  # E2E は out/ を見る。先に必ずビルドする
npm run test:e2e                                               # 全体。out/ を 4173 で配る
npx playwright test tests/edit-anchors.spec.ts -g '閲覧'       # 反復中は spec と名前で絞る
E2E_PORT=4199 npm run test:e2e                                 # 4173 を別のチェックアウトが握っているとき
```

- 走る前に、配信中の `/` がこのチェックアウトの `out/index.html` と同じかを照合する。違えば止まるので、
  そのサーバを止めるか `E2E_PORT` を変える(別の worktree のビルドを検査して全部緑になる事故を防ぐ)
- 再試行はしない(`retries: 0`)。1回だけ落ちて次に通る揺れも、再実行で流さず原因を直す
- ブラウザを入れる `npx playwright install` は、同じ機械の他のリポジトリと `~/.cache/ms-playwright` を共有する(`docs/pitfalls.md`)

## 計測(GoatCounter)に数えさせない

配信版には計測のタグが載っている。**配信版を開くのは E2E の spec だけにする。**
spec はどの context でも `gc.zgo.at`・`*.goatcounter.com` への要求を止め、`localStorage` に `skipgc` を立てる(二重の遮断。
`tests/seatmap.helpers.ts`)。手のブラウザ・別の道具で配信版を開くなら、先に `skipgc` を立てるか計測先を止め、
`*.goatcounter.com/count` へ1通も送っていないことを確かめる。CI のビルドには計測先を渡していない。
