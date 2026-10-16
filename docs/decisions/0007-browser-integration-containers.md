# 0007. 画面をコンテナ(container.tsx)にし、実ブラウザ(Vitest Browser Mode)で描く統合テストを E2E の手前に置く

## Status

Accepted(2026-10-16、利用者の決定「J-paku.github.io のように utils・lib・hooks・コンテナ・表示部品に分け、統合テストを先に置き、
統合で確かめられないものだけを E2E で見る」)。J-paku.github.io の ADR 0016(層をテスティングトロフィーにし、Vitest Browser Mode の
統合テストを一番厚くする)・0017(コンテナ)・0018(E2E の移し方とフックの全部の門)と同じ形を、段階に分けてこのリポジトリに置く。
この記録はその1段階目(下の「次の段階」)。

次の部分を置き換える。

- [0004](0004-extreme-constraints.md) の「テストの境界」の「フックの振る舞いは E2E が見る」と、Consequences の「振る舞いは E2E だけが見る」。
  フックは、それを使うコンテナの統合テストでも見る
- 0004 の「フックはカバレッジも測らない」のうち統合テストの側。統合のカバレッジ(`npm run test:integration -- --coverage`)はフックも測る。
  単体のカバレッジ(`vitest.config.ts`)は今までどおりフックを測らない

`hooks` フォルダに単体テストを置かない・どのテストでも `renderHook` を使わない(0004、`npm run test:boundary`)は変えない。
E2E(`tests/`)はこの段階では変えない

## Context

決める前(`4ef1c85`)のこのリポジトリは次の状態だった。

- テストは単体と E2E の2層だった。単体は `vitest.config.ts` で `src/**/*.test.ts` を node で走らせ(31ファイルは先頭の注釈で happy-dom)、
  E2E は `npm run build` の結果の `out/` を配って走る([0003](0003-playwright-e2e.md))。コンポーネントを描くテスト(`*.test.tsx`)は1本も無かった
- フックはカバレッジの分母から外れ(`vitest.config.ts` の `src/**/hooks/**`)、振る舞いは E2E だけが見ていた(0004)。E2E はビルドの後でしか走らない
- 画面ルートは `src/components/SeatMapView/` の `index.tsx` で、同じフォルダの `hooks` のフックを呼んで子の部品へ渡していた。
  `src/pages/index.tsx` はそれを `@/components/SeatMapView` で読んでいた
- 配信(`.github/workflows/deploy-pages.yml`)は main への push を引き金にしていて、同じ push の ci(`.github/workflows/ci.yml`)の結果を待たなかった
- J-paku.github.io は 2026-10-13〜15 に、層をテスティングトロフィーにして統合テストを一番厚くし(0016)、画面をコンテナにして統合テストの単位にし(0017)、
  重なる E2E を統合へ移してフックの全部をファイル別100%にした(0018)

## Decision

### 層とファイル名

| 層 | 対象 | 実行環境 | ファイル名 |
|---|---|---|---|
| 単体 | 純粋関数と `src/lib/` の入口(ファイル別100%・変異100%。0004) | Vitest の node(一部は happy-dom)。設定は `vitest.config.ts` | `*.test.ts` |
| 統合 | コンテナを、フック・子と一緒に描く | Vitest Browser Mode(`@vitest/browser-playwright` の Chromium・headless・ビルド無し)。設定は `vitest.integration.config.ts` | `container.browser.test.tsx`(コンテナごとに1本) |
| E2E | 受入条件(0003)。4段階目からは統合で確かめられないものだけ | Playwright と `out/` | `tests/*.spec.ts` |

### 統合テストの約束

1. 実際の Chromium で、ビルド無しで描く
2. モックはネットワークと時間だけ。モジュールは差し替えない
3. `localStorage` は本物のブラウザの保存先を使う。別のタブが保存した状態・保存先が一杯の状態も、本物の保存先に書いて作る
4. 断定は利用者に見えるもの(role・名前・文字・`aria-*`)と、固定の DOM フック(`CLAUDE.md` の不変ルール4)で行う
5. Next のルーターは、Next の本物の `RouterContext` に値を渡す(モジュールのモックにしない)。
   SWR の覚え(キャッシュ)はテストごとに新しい `Map` にする(新しくページを開いたのと同じ)
6. 環境は次のとおり固定する: 画面寸法 1280×900(E2E の `playwright.config.ts` と同じ)、ブラウザの時間帯 UTC(provider の `contextOptions`。CI の機器と同じ)、
   `next/image` が読む `process.env.__NEXT_IMAGE_OPTS` は Next のビルドと同じ元(既定値に `next.config.mjs` の `images` を重ねたもの)から `define` で入れる

### 設定を単体と分ける

- 統合の設定は別のファイル `vitest.integration.config.ts` にする。変異テスト(`stryker.config.mjs`)が `vitest.config.ts` を読み、
  Stryker の Browser Mode 対応は測っていないので、変異テストは node の単体だけで回す(`vitest.integration.config.ts` の冒頭の注釈)
- 単体の設定は `src/**/*.test.ts` だけを、統合の設定は `src/**/container.browser.test.tsx` だけを拾う
- 統合のカバレッジは v8 で、`--coverage` を付けたときだけ測る(報告は `coverage/integration`)。`hooks` フォルダの下も測る。
  下限(`thresholds`)はまだ掛けない。3段階目でフックの門と一緒に掛ける

### コンテナ

- コンテナは、画面の状態・データのフックを呼んで表示部品へ渡す画面の入口で、名前が `container.tsx` のファイル。統合テストが描く単位になる
- 置くフォルダの一覧の正本は `scripts/container-dirs.mjs`。今は `src/components/SeatMapView/` の1つだけ
- `src/components/SeatMapView/` の `index.tsx` を `container.tsx` へ移した(中身は変えていない)。
  `src/pages/index.tsx` は `@/components/SeatMapView/container` を直接 import する。コンテナのフォルダは `index.tsx` ではなく `container.tsx` が入口になる
  (`docs/structure.md` 5.・`docs/authoring.md` 3.2 の「フォルダにしたコンポーネントは `index.tsx` が入口」の例外)

### 機械が守らせる所

`npm run test:boundary`(`scripts/check-test-boundary.mjs`)が次を落とす。判定は今までどおり、走るたびに自己検査で確かめる。

- 統合テストの名前(`*.browser.test.*`・`*.browser.spec.*`)のファイルを、一覧のフォルダの `container.tsx` の隣の `container.browser.test.tsx` 以外に置くこと
- 一覧のフォルダに `container.tsx` か `container.browser.test.tsx` が無いこと(改名・移動で一覧が空振りすること)
- 一覧の外に `container.tsx` を置くこと
- `container.browser.test.tsx` が同じフォルダの `./container` を値として import しないこと(型だけの import は数えない。import は TypeScript の構文木で読む)

今までの規則(`hooks` フォルダの下の単体テスト・`renderHook`)はそのまま見る。

### 門と配信

- `npm run verify` の中では、`npm run test:integration` を `test:boundary` の後・`knip` の前に置く
- ci では Test boundary の後に統合テストを置く。統合テストも E2E と同じ Chromium を使うので、Playwright のブラウザのキャッシュと導入の段を
  Build の後から統合テストの前へ移した
- 配信の引き金を、main への push から ci の完了(`workflow_run`)へ替えた。ci が成功し、その ci が push で走ったときだけ、
  ci が検査したコミット(`head_sha`)を配信する。push を直接の引き金にすると ci の結果を待たずに配信され、検査に落ちたコミットも公開されるため
  (`.github/workflows/deploy-pages.yml` の冒頭の注釈)。手で配り直す(`workflow_dispatch`)ときは ci の結果を見ず、選んだブランチの最新を配信する

### J-paku.github.io との違い

- **画面のフォルダに `index.tsx` を残さない。** J-paku の画面の `index.tsx` は、サーバでだけ働くローダー(content の読み出し・スプライトの生成など。J-paku の 0017 の D2)である。
  このリポジトリは Pages Router の静的書き出しで、`src/pages/` に `getStaticProps` も無く、データはクライアントで SWR が取る(`src/hooks/use-mock-data.ts`)。
  `index.tsx` に残す仕事が無いので消し、ルート(`src/pages/index.tsx`)がコンテナを直接指す
- **カバレッジの下限はまだ無い。** J-paku は統合のカバレッジに全体の床を掛け(0017)、フックの全部をファイル別100%にした(0018)。ここでは3段階目で掛ける
- **段階に分ける。** J-paku は 0017・0018 をそれぞれ1回の作業で入れた。ここではコンテナを1つ置いたところで止め、残りを次の段階に回す
- **移して消す happy-dom のコンポーネントテストが無い。** J-paku の 0017 は happy-dom でコンポーネントを描く8本を統合へ移して消した。このリポジトリには元から無い

### 次の段階(予定)

2. 残りの I/O に触れる部品をコンテナと表示部品に分け、表示部品が I/O の入口を import しないことを検査で落とす
3. フックの全部を、統合のカバレッジでファイル別100%にする(フォルダごとに掛ける)
4. E2E を整理する。統合で確かめられないもの(ビルドの結果・basePath・保存先が塞がれた時など)だけを E2E に残すか足す。
   E2E を消すときは、欠陥を入れて統合テストと E2E がどちらも落ちるのを見てから消す。消すことは 0004 の言う「テストを消す」に当たるので、その段階で ADR を書く

## Consequences

- 座席マップ画面のフックは、ビルド無しの統合テストでも動くようになった。同じ振る舞いを統合テストと E2E が二重に見る期間が、4段階目まで続く
- 統合テストは Chromium を立てるので、手元でも E2E と同じ `~/.cache/ms-playwright` のブラウザが要る。そこは同じ機械の他のリポジトリと共有している(`docs/pitfalls.md`)
- `@vitest/browser-playwright` の peer は vitest の 4.1.11 ちょうどを求める(`package-lock.json`)。vitest を上げるときは、これも同じ版にそろえて上げる
- `next/image` は、ブラウザに `process` が無いと読み込んだだけで `ReferenceError` を投げる(2026-10-16 の実測。`vitest.integration.config.ts` の注釈)。
  座席マップ画面のヘッダー(`src/components/SeatMapView/components/AppHeader.tsx`)が `next/image` を使うので、統合の設定が `define` で値を入れている
- 統合テストと統合の設定は Next の公開されていない内部の経路(`next/dist/shared/lib` の下の `router-context.shared-runtime`・`mitt`・`image-config`)を
  import している(`container.browser.test.tsx`・`vitest.integration.config.ts`)。Next を上げてその経路が変わると、統合テストはテストの中身より先に import の失敗で落ちる
- 単体のカバレッジの床・ファイル別100%の対象・変異テストの対象は変えていない。ただし CI の変異テストの結果のキャッシュの鍵は
  `package-lock.json`・`stryker.config.mjs`・`vitest.config.ts` の指紋(`.github/workflows/ci.yml`)で、この作業は `package-lock.json`(統合テストの依存を足した)と
  `vitest.config.ts`(注釈を直した)を変えたので、最初の push で全部が走る(0004 の「変異テストの走らせ方」)
- 配信されるのは、main への push で ci が緑になったコミットだけになった。手で配り直すときだけは ci を通っていないコミットも配信しうる
- CI の時間への影響は測っていない

## Alternatives Considered

- **統合テストを `vitest.config.ts` の中(projects)に入れる** — 変異テストが `vitest.config.ts` を読み、Stryker の Browser Mode 対応を測っていないので採らない
- **画面の `index.tsx` を残し、`container.tsx` を export し直すだけの入口にする** — 残す仕事が無いので消した(上)。この案と比べた記録はそれ以外に無い
- ほかに比べた案の記録は無い
