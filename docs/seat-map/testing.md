# testing.md — 座席マップキャンバスの受入条件と検証手段

## 1. `scripts/verify-s1.js`

`CLAUDE.md` の完了条件が名指しする検証スクリプト。ブラウザの実行中の画面(devtools コンソール、
または後述の Playwright ハーネス経由)へ丸ごと貼って実行する IIFE で、DOM を直接見て
`{ verdict: 'PASS'|'FAIL', pass, fail }` を返す。ユニットテストではなく**実測**であり、
`npx tsc --noEmit` はこの代わりにならない(`docs/pitfalls.md` 3番)。

以下、`scripts/verify-s1.js` が呼ぶ10件の `ck(...)` 判定(ソース内出現順)と、それぞれが本ドメイン
(座席マップキャンバス)のどの不変ルール/挙動に対応するかの対照表。スクリプト自身のコメントは
「1.〜8.」の8項目見出ししか持たない(「変換レイヤーの存在」「チーム箱が存在」は見出し無しの
判定なので、下表の # とスクリプト内コメント番号は一致しない)。

| # | 検査内容 | 判定式(要約) | 対応する不変ルール/挙動 |
|---|---|---|---|
| 1 | 変換レイヤーの存在 | `[data-canvas-transform-layer="true"]` が1つ以上 | `architecture.md` 5章 |
| 2 | キャンバスに個人座席カードが無い | 変換レイヤーの `innerText` に在席状態語(在席/空席/会議中/外出/リモート/出張/退勤/休み)が**含まれない** | `CLAUDE.md` 不変ルール1(閲覧モード限定。編集モードは `EditSeatLayer` が意図して座席カードを描くため、後述の `run-all-checks.mjs` がこの1件だけ編集モードで除外する) |
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
混在する。下の2章に現存するスクリプトを棚卸しする。「検証されているように見えて実は
1回も実測されていない」を避けるため、無いものは無いと書く。

## 2. `~/dev/.seatmap-port/` の関連スクリプト

このディレクトリはリポジトリ外(検証用の使い捨てスクリプト置き場)。本ドメインに関係するものだけ
挙げる。`check-hit2.mjs` `check-desktop-hit.mjs` `check-minimap.mjs` 等、サイドバー検索や
`.team-ovl-*` セレクタを中心に検証するスクリプトは、`.my-seat-button` 等キャンバス側の要素を
経由していても実質チームオーバーレイの内部検証のため対象外——`docs/team-overlay/` 側の管轄。

| スクリプト | 検証内容 | 本ドメインとの関係 |
|---|---|---|
| `run-all-checks.mjs` | `verify-s1.js` を「閲覧モード」「編集モード」「ゴースト配置中」の3状態で走らせ、3状態とも `PASS`(編集/ゴーストは「座席カードが無い」判定のみ除外)であることを見る | 編集用の変更が閲覧モードの不変条件を壊していないかを1本で確認する意図(`run-all-checks.mjs:1-2` のコメント)。「ゴースト表示中もチーム箱がクリックを直接受けるか」を状態別に記録する(`run-all-checks.mjs:96-100`) |
| `check-legacy-layout.mjs` | `furniture` キーを持たない旧形式の保存レイアウトを実際に `localStorage` へ書いてから新コードで読ませ、`[data-team-id]` `[data-facility="true"]` `[data-canvas-transform-layer="true"]` が生きていること、チーム箱を開けることを見る | `lib/layout-persistence.ts` の `furniture ?? []` 既定値埋めが実際に効くかの実測。新しいブラウザでは再現しない経路をあえて踏む(`check-legacy-layout.mjs:1-2` のコメント、`docs/pitfalls.md` 2番と同系統) |
| `measure-reset.mjs` | ズームボタンの「リセット」ボタンの `font-size`/`white-space`/文字幅/行数をフォントサイズ別に実測 | `spec.md` 2章のズームボタン。CSS 特異度の衝突(既存 `.zoom-controls button` 規則が新規クラスの `font-size` だけ勝つ)を「症状」ではなく computed 値で判定する目的。過去に発生した具体事故は `~/.claude/rules/03-pitfalls.md` 6番参照 |
| `check-hit.mjs` | `.my-seat-button` クリック前後でキャンバスの `transform` が変化しないこと(`transformBefore === transformAfter`)、リセットボタンの折り返し実測 | 「自分の席」ボタン(`MySeatButton`)がキャンバス操作コマンドを一切呼ばないという境界部分の実測。同スクリプトは HIT 表示・スポットライトも見ているが、そちらは **チームオーバーレイ側の検証範囲**(`docs/team-overlay/` 参照) |

上記いずれも本リポジトリにコミットされたテストではなく、セッションごとに作られる検証ハーネス。
再実行したい場合はスクリプト内の対象 URL(`process.argv[2]` 等)と DOM セレクタが現在のコードと
一致しているか先に確認すること(`~/.claude/rules/02-verifying.md` 6章「検証対象確認」)。

## 3. 実行環境の注意

- `verify-s1.js` は「ローカル」と「プッシュ後の GitHub Pages 配信版」の両方で `PASS` して初めて
  完了(`CLAUDE.md` 完了条件)。ローカル `PASS` だけで完了と言わない
- ローカルで確かめる際は dev サーバーではなくビルド成果物(`npm run build` の静的出力)に対して
  実行する。`/mnt/c` 配下では Turbopack のファイル監視が取りこぼし、ソースを戻しても古いバンドルが
  配られ続けたまま検証が「落ちないテスト」になった実例がある(`~/.claude/rules/03-pitfalls.md` 9番)
- 新しく検証コード(Playwright スクリプト等)を書いたときは、修正を一時的に外す/期待値を反転させる
  などで意図的に一度 `FAIL` させ、検出力があることを確認してから採用する
  (`~/.claude/rules/02-verifying.md` 9章、`check-hit-clear.mjs` の `FALSIFY` 環境変数がこの実例)

## 未検証・要確認

- `verify-s1.js` は座席の**在席状態語がキャンバスに出ないこと**しか見ておらず、座席そのものが
  1件も描かれていないことは検証していない(将来的に在席状態を含まない座席カードを誤って
  キャンバスへ描いても、この検査は通ってしまう)
- 家具(`Furniture`)の描画有無を直接見る検査項目は無い(`data-furniture-id` は会議室と共有の
  属性のため、`verify-s1.js` の項目10は会議室専用の `data-facility="true"` だけを数えている)
