# testing.md — 座席マップキャンバスの受入条件と検証手段

## 1. `scripts/verify-s1.js`

キャンバスの不変条件を見る判定スクリプト。E2E(3章の `tests/edit-anchors.spec.ts`)が画面状態を作ってから
注入する。devtools のコンソールへ丸ごと貼っても走る IIFE で、DOM を直接見て
`{ verdict: 'PASS'|'FAIL', pass, fail }` を返す。ユニットテストではなく**実測**であり、
型検査はこの代わりにならない(`docs/pitfalls.md` 3番)。
E2E の全体の一覧と走らせ方は `docs/agents/verification.md`。

以下、`scripts/verify-s1.js` が呼ぶ10件の `ck(...)` 判定(ソース内出現順)と、それぞれが本ドメイン
(座席マップキャンバス)のどの不変ルール/挙動に対応するかの対照表。スクリプト自身のコメントは
「1.〜8.」の8項目見出ししか持たない(「変換レイヤーの存在」「チーム箱が存在」は見出し無しの
判定なので、下表の # とスクリプト内コメント番号は一致しない)。

| # | 検査内容 | 判定式(要約) | 対応する不変ルール/挙動 |
|---|---|---|---|
| 1 | 変換レイヤーの存在 | `[data-canvas-transform-layer="true"]` が1つ以上 | `architecture.md` 5章 |
| 2 | キャンバスに個人座席カードが無い | 変換レイヤーの `innerText` に在席状態語(在席/空席/会議中/外出/リモート/出張/退勤/休み)が**含まれない** | `CLAUDE.md` 不変ルール1(閲覧・編集・ゴースト配置中の全モードに例外なく適用。編集セッション中もキャンバスは個人座席カードを描かず、座席は `.sr-only` ミラーレイヤーにのみ存在する) |
| 3 | sr-only 座席ミラーが存在 | `.sr-only` の中に `button` が1つ以上 | `spec.md` 5章(`SeatMirrorLayer`) |
| 4 | チーム箱が存在 | `[data-team-id]` が1つ以上 | `architecture.md` 5章 |
| 5 | チーム箱がクリックを直接受ける | 各チーム箱の中心座標で `document.elementFromPoint` した要素が、その箱自身か箱の子孫である(画面外の箱はスキップ) | `spec.md` 3章「キャンバスのパンとの排他」。何かに覆われて当たり判定が奪われていないことの実測 |
| 6 | チーム箱同士が重ならない | 全チーム箱の `getBoundingClientRect()` を総当たりし矩形が交差しない | `mocks/teams.json` の `area` が非重複であることの画面上の裏付け |
| 7 | 通路ラベルが存在 | `innerText` に「通路」を含む | `spec.md` 4章(`aisle` の表示) |
| 8 | 初期倍率 ≤0.65 | 変換レイヤーの `getComputedStyle().transform` を `matrix(...)` から正規表現でパースし `scale` を取得、0.651以下 | `spec.md` 2章(`computeCompact` の上限0.65) |
| 9 | チームラベルに「N名」表記 | `innerText` が `/\d+名/` にマッチ | `spec.md` 3章(配属数カウンタ) |
| 10 | 会議室が存在 | `[data-facility="true"]` が1つ以上 | `spec.md` 4章 / `architecture.md` 5章 |

(`ck` 呼び出し順は `scripts/verify-s1.js:7-55`)

### 検証手段が無い項目(この場で明言する)

`verify-s1.js` は静的な1回の DOM スナップショット判定であり、以下は**この場では検証していない**
(仕様として存在はするが、`verify-s1.js` の判定対象外):

- パン/ズームの操作結果(慣性の減速曲線、ピンチの追従、ホイール1ノッチの量、キーボード±の量)
- ダブルタップ/2本指タップのしきい値(300ms・40px・250ms・log2 0.07)そのものの実測
- 長押し(300ms)の発火・クリック抑制の実測
- 会議室ホバーカードの表示位置・表示条件(マウス限定)
- ズームボタン・「自分の席」ボタンの見た目(フォントサイズ・折り返し)

これらは `~/dev/.seatmap-port/`(セッションごとに使い捨てで作る Playwright ハーネス置き場、
本リポジトリの一部ではない)側に個別スクリプトがあるものと、**その場でも作られていないもの**が
混在する。下の5章に現存するスクリプトを棚卸しする。「検証されているように見えて実は
1回も実測されていない」を避けるため、無いものは無いと書く。

## 2. `scripts/verify-edit-anchors.js`

4編集フロー仕様(`SPEC-4edit-flows.md` §08-4 の E2Eアンカー表 + §07-6 のトースト文言のうち DOM で
確認できるもの)を検査する。`verify-s1.js` と同じ**注入型IIFE**で、実行中の画面へ丸ごと貼って実行
すると `{ verdict, state, checkedAnchors, pass, fail, skip }` を返す。`verify-s1.js` と違い
本リポジトリにコミットされた検証スクリプトが無く、これまでは §08-4 のアンカーを毎回一回性の
ハーネスで確認しては捨てていた(アンカーが後から静かに壊れても誰も気づけない状態だった)ため、
そのギャップを埋める目的で追加した。

§08-4 のアンカーはほとんどが「特定の画面状態でしか存在しない」(例: 「編集を完了」は編集セッション
中だけ)。そのため `verify-s1.js` のような単一スナップショット判定にはできず、まず **DOM から現在の
画面状態を判定し(`state`)、その状態で存在すべきアンカーだけを検査する。**

### 状態判定(優先順位。内側の状態が先に判定される)

| 優先 | `state` | 判定条件(DOM) |
|---|---|---|
| 0 | (判定不能) | `[data-canvas-transform-layer="true"]` が無い → 即 `verdict:'UNKNOWN'`、検査ゼロ件で終了 |
| 1 | `employee-search` | `[role="dialog"][aria-label="社員検索"]` が存在 |
| 2 | `ghost-placement` | `[role="img"][aria-label="配置プレビュー（ドラッグで移動）"]` が存在 |
| 3 | `overlay-edit` | チームオーバーレイ(`[role="dialog"][aria-label$=" 座席配置"]`)かつ `[role="group"][aria-label="編集ツールバー"]` が存在 |
| 4 | `overlay-view` | チームオーバーレイのみ(EditDock無し) |
| 5 | `edit-session` | `[data-edit-mode-badge="true"]` が存在 |
| 6 | `browsing`(既定) | 上記いずれにも該当しない |

状態が判定できない(座席マップ画面自体が読み込まれていない)場合は `pass`/`fail` を一切積まず
`verdict:'UNKNOWN'` を返す。また `checkedAnchors`(=`pass.length + fail.length`)が0件のときも
`PASS` にはならない — 「0件検査して黙って通過する」のが最も危険という方針(`02-verifying.md` 6章)。

### 状態別の検査範囲

| `state` | 検査するアンカー(存在) | 検査するアンカー(不在) |
|---|---|---|
| `browsing` | 追加メニューを開く | 編集を完了 / 所属人員を編集 / 配置プレビュー（ドラッグで移動） |
| `edit-session` | 編集を完了 / 編集をキャンセル / 編集を終了 / 使い方ガイドを見る | 追加メニューを開く / 配置プレビュー（ドラッグで移動） |
| `ghost-placement` | 配置プレビュー（ドラッグで移動） / この位置に配置(または重なっているため配置できません) / 配置をキャンセル / 編集を終了 / 使い方ガイドを見る / (リサイズ可能なゴーストのみ)サイズを変更 | 編集を完了 / 追加メニューを開く |
| `overlay-view` | 所属人員を編集 | 編集ツールバー / 追加メニューを開く / 配置プレビュー（ドラッグで移動） |
| `overlay-edit` | 編集ツールバー / 変更を保存 / 編集をキャンセル / 座席を削除 / フリーアドレス設定(role=switch) / (条件付き)席追加・座席の向きを回転（現在 …）・空き行/列を削除・部署メンバーを一括取込 | 所属人員を編集 / 追加メニューを開く / 配置プレビュー（ドラッグで移動） |
| `employee-search` | 社員検索(ダイアログ自身) / (検索モードのみ)社員を検索・部署メンバーを一括取込 | — |
| (全状態共通・任意) | 直前の変更を戻す(表示されていれば検査、無ければ`skip`) | — |

`overlay-edit` の「条件付き」項目と `直前の変更を戻す` は、そのチーム/操作の状態次第で存在しないの
が正常なため、無ければ `fail` ではなく `skip` に積む。一方で `座席を削除` と
`フリーアドレス設定`(role=switch)は §08-4 に明記されたアンカーで、書いた当時は実装が無く `fail` に
残していた。2026-10-12 の時点ではどちらも実装がある(`src/components/edit/SeatActionBar.tsx`・
`src/components/TeamOverlay/components/SeatLayoutHeader.tsx`)。`ghost-placement` のリサイズハンドル
(`サイズを変更`)は、ハンドルが出ていれば8個と読み上げ名を検査し、出ていなければ `skip` に積む。
検査を通すために項目を外さない方針は変わらない。E2E(3章)はどの状態でも `fail` が0件であることを求める。

### 実行方法

E2E では `tests/edit-anchors.spec.ts` が `page.evaluate` で注入する(3章)。手で確かめるときは devtools の
コンソールへソースを丸ごと貼る。そのときは初回訪問のコーチマークが画面を覆うので、`localStorage` の
`seatmap_coach_*` を事前に `'1'` にしておく。

## 3. `tests/edit-anchors.spec.ts`(旧 `run-all-checks.mjs`)

`verify-s1.js` と `verify-edit-anchors.js` を画面状態ごとに注入して判定する E2E。以前はリポジトリ管理下の
ランナー `run-all-checks.mjs` がこの役で、さらにその前は `~/dev/.seatmap-port/`(5章)へセッションのたびに
一回性のハーネスを作っては捨てていた。2026-10-12 にランナーを Playwright の E2E へ移して消した
(判定の数は移す前と同じ60件。`docs/decisions/0003-playwright-e2e.md`)。

### 巡回する状態

`verify-edit-anchors.js` の `state` 判定と1対1で対応する5状態を、状態ごとに1テスト・新しいページで
到達する(前の状態の副作用を持ち込まないため、状態を跨いでページを使い回さない)。

| `state` | 表示名 | 到達手順(要約) |
|---|---|---|
| `browsing` | 閲覧 | 既定状態。追加操作なし |
| `edit-session` | 編集セッション中 | +FAB(`追加メニューを開く`) → メニュー項目「レイアウトを編集」 |
| `ghost-placement` | ゴースト配置中 | +FAB → メニュー項目「チーム」 → 「チームを追加」シートの「新規作成」 |
| `overlay-view` | チームオーバーレイ | `[data-team-id]` の最初の1件をクリック |
| `overlay-edit` | オーバーレイ編集中 | `overlay-view` に到達後、「所属人員を編集」(鉛筆)をクリック |

`browsing` / `edit-session` / `ghost-placement` の3状態では `verify-s1.js`(キャンバス不変条件)も
併走させる。`overlay-view` / `overlay-edit` はモーダルがキャンバス手前を覆うため対象外にした——
併走させると「チーム箱がクリックを直接受ける」等がモーダルに覆われて構造的に FAIL するが、それは
アプリのバグではなく検査の適用対象外なので、そもそも走らせない設計にした。

### 到達失敗・状態不一致の扱い

- 状態に到達できない(セレクタが出ない)と、到達の待ちが時間切れになってそのテストが落ちる
- `verify-edit-anchors.js` が判定した `state` が狙った状態と違えば落とす(例: `ghost-placement` へ向かった
  つもりで `edit-session` のまま止まっていた、といった取り違えを検出するため)
- 判定を1件も下していなければ落とす(`tests/seatmap.helpers.ts` の `recordChecked`)。「0件検査して黙って
  通過する」を避ける方針は `verify-edit-anchors.js` 自身の設計(2章)と同じ(`02-verifying.md` 6章)

### 実行方法

```bash
npm run build                                           # E2E は out/ を見る
npx playwright test tests/edit-anchors.spec.ts          # out/ を 4173 で配って走らせる
E2E_BASE_URL=https://j-paku.github.io/seatmap-demo/ npx playwright test tests/edit-anchors.spec.ts
```

配信のポート・配信物の照合・計測(GoatCounter)の遮断は全 spec 共通で、`docs/agents/verification.md` にある。

### 画面を開く前に撒くキー

- 初回訪問のコーチマーク(全画面オーバーレイ)がクリックを奪うので、`localStorage` の `seatmap_coach_*` を
  `'1'` にしてから開く。キーはハードコードせず、`src/` の `.ts`/`.tsx` を走査して `seatmap_coach_[A-Za-z0-9_]+`
  に一致する文字列を集める(`src/components/CoachMarkTour/utils/tour-steps.ts` の既読キー一覧と同じ情報源)。
  ツアーが増えても spec 側の変更は要らない
- ログインゲートの通過の印を sessionStorage に撒く。キーは `src/lib/session-auth.ts` の定義をソースから読む
- どちらも `tests/seatmap.helpers.ts` の `test` がどの context にも敷く

## 4. ほかの E2E

| spec | 見るもの | 移す前 |
|---|---|---|
| `tests/ghost-placement.spec.ts` | ゴースト配置の3シナリオ(新規配置・掴み直し・配置中のセッション終了)で `scripts/verify-ghost.js` を局面ごとに注入する。最後に全シナリオの `skip` を突き合わせ、どの局面でも実測されなかった判定が残れば落とす(このためファイルの中だけ serial) | `run-ghost-checks.mjs`(判定数は同じ361件) |
| `tests/offscreen-indicator.spec.ts` | 全チームエリアが画面外に出たときだけ端に出る「チームへ移動」ボタンの出現・外観・クリックでの復帰と、通路だけが見える位置での出現 | `verify-offscreen-indicator.mjs`(判定数は同じ18件) |

到達手順と実測の道具は `tests/ghost.helpers.ts`。オフスクリーンインジケーターの検出力は、
`use-offscreen-team-indicator.ts` の通路を除く行を消して再ビルドすると通路だけの位置のテストが落ちることで見る
(spec の冒頭の注釈)。

## 5. `~/dev/.seatmap-port/` の関連スクリプト(E2E に入っていないもの)

このディレクトリはリポジトリ外(検証用の使い捨てスクリプト置き場)。本ドメインに関係するものだけ
挙げる。`check-hit2.mjs` `check-desktop-hit.mjs` `check-minimap.mjs` 等、サイドバー検索や
`.team-ovl-*` セレクタを中心に検証するスクリプトは、`.my-seat-button` 等キャンバス側の要素を
経由していても実質チームオーバーレイの内部検証のため対象外——`docs/team-overlay/` 側の管轄。
`run-all-checks.mjs` はこの一覧から外した(3章の通り E2E へ移したため)。

| スクリプト | 検証内容 | 本ドメインとの関係 |
|---|---|---|
| `check-legacy-layout.mjs` | `furniture` キーを持たない旧形式の保存レイアウトを実際に `localStorage` へ書いてから新コードで読ませ、`[data-team-id]` `[data-facility="true"]` `[data-canvas-transform-layer="true"]` が生きていること、チーム箱を開けることを見る | `src/lib/layout-persistence.ts` の `furniture ?? []` 既定値埋めが実際に効くかの実測。新しいブラウザでは再現しない経路をあえて踏む(`check-legacy-layout.mjs:1-2` のコメント、`docs/pitfalls.md` 2番と同系統) |
| `measure-reset.mjs` | ズームボタンの「リセット」ボタンの `font-size`/`white-space`/文字幅/行数をフォントサイズ別に実測 | `spec.md` 2章のズームボタン。CSS 特異度の衝突(既存 `.zoom-controls button` 規則が新規クラスの `font-size` だけ勝つ)を「症状」ではなく computed 値で判定する目的。過去に発生した具体事故は `docs/conventions/03-pitfalls.md` 6番参照 |
| `check-hit.mjs` | `.my-seat-button` クリック前後でキャンバスの `transform` が変化しないこと(`transformBefore === transformAfter`)、リセットボタンの折り返し実測 | 「自分の席」ボタン(`MySeatButton`)がキャンバス操作コマンドを一切呼ばないという境界部分の実測。同スクリプトは HIT 表示・スポットライトも見ているが、そちらは **チームオーバーレイ側の検証範囲**(`docs/team-overlay/` 参照) |

上記いずれも本リポジトリにコミットされたテストではなく、セッションごとに作られる検証ハーネス。
再実行したい場合はスクリプト内の対象 URL(`process.argv[2]` 等)と DOM セレクタが現在のコードと
一致しているか先に確認すること(`docs/conventions/02-verifying.md` 6章「検証対象確認」)。

## 6. 実行環境の注意

- E2E は「手元の `out/`」と「push 後の GitHub Pages 配信版」(`E2E_BASE_URL`)の両方で通って初めて
  完了(`docs/agents/verification.md` の完了の条件)。ローカルの PASS だけで完了と言わない
- 手元では dev サーバーではなくビルド成果物(`npm run build` の `out/`)に対して走らせる。配信版と同じ
  静的書き出しを検査するため。リポジトリが `/mnt/c` にあった頃は Turbopack のファイル監視が取りこぼし、
  ソースを戻しても古いバンドルが配られ続けたまま検証が「落ちないテスト」になった実例もある
  (`docs/conventions/03-pitfalls.md` 9番。今は Linux 側のディスクにある。`docs/decisions/0001-linux-disk-and-src.md`)
- 新しく検証コード(spec・注入スクリプト)を書いたときは、修正を一時的に外す/期待値を反転させる
  などで意図的に一度 `FAIL` させ、検出力があることを確認してから採用する
  (`docs/conventions/02-verifying.md` 9章、`check-hit-clear.mjs` の `FALSIFY` 環境変数がこの実例)

## 未検証・要確認

- `verify-s1.js` は座席の**在席状態語がキャンバスに出ないこと**しか見ておらず、座席そのものが
  1件も描かれていないことは検証していない(将来的に在席状態を含まない座席カードを誤って
  キャンバスへ描いても、この検査は通ってしまう)
- 家具(`Furniture`)の描画有無を直接見る検査項目は無い(`data-furniture-id` は会議室と共有の
  属性のため、`verify-s1.js` の項目10は会議室専用の `data-facility="true"` だけを数えている)
