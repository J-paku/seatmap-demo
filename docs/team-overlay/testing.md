# TeamOverlay — 受入条件と確認手段

検証スクリプトは `~/dev/.seatmap-port/`(このリポジトリの外、未コミット)に常設。Playwright
(`playwright-core`)で実ブラウザを操作する。**dev サーバーではなくビルド成果物への配信に対して実行
する**(`~/.claude/rules/03-pitfalls.md` 9番、`docs/pitfalls.md` 3番 — WSL の `/mnt/c` では dev サーバー
のファイル監視が取りこぼし、古いバンドルを配り続けることがあるため)。

実行例: `node check-scrollhint.mjs <baseUrl>`

## 1. スクリプト対応表

| 受入条件領域 | スクリプト | 主な確認内容 |
|---|---|---|
| 横スクロールヒント | `check-scrollhint.mjs` | Desktop/Compact 双方でボタン化・実クリックで `scrollLeft` 移動・端で `isFaded`+`disabled`・透過アルファ 0.30〜0.40(ライト/dracula 両テーマ) |
| ミニマップ既定値(localStorage 3状態) | `check-scrollhint.mjs`(D節、238〜307行) | キーなし/`'false'`/`'true'` の3状態で展開/折りたたみが一致するか、ハイドレーション不一致系のコンソールエラーが無いか |
| ミニマップの図・操作 | `check-minimap.mjs` | 座席グリッド下配置・キーボード開閉・フォーカスリング・十字線/矩形が枠内・テーマ別配色・別チーム/リロード後の永続。**2節の既知の矛盾に注意** |
| HIT 解除 | `check-hit-clear.mjs` | ヒット席自身/別の在席カード/空席/パネル余白/ヘッダー/ミニマップ の6ケース × WIDE(1280×900)/NARROW(390×844) |

`check-hit-clear.mjs` は `FALSIFY=case1,case4` のように期待値を反転させる実行モードを持つ(検証手段
自体の検出力を自己証明するためのもの、スクリプト冒頭のコメント)。

## 2. 既知の矛盾 — ミニマップ既定値(`check-minimap.mjs` は現行仕様と食い違う)

`hooks/use-minimap-collapse.ts:7-11` の現行ソースは「保存値が無ければ展開(true)」— commit
`dc7c990` で確定した仕様(`spec.md` 6節)。

これに対し検証スクリプト側の記述は割れている。

- `check-minimap.mjs:42-51` は「初期は閉・中身は非描画」として `expanded === 'false'` を要求する。
  localStorage キーが無い状態を前提にしており、**現行ソースの既定(開)と矛盾する**
- `check-scrollhint.mjs` の D 節(`check-scrollhint.mjs:273-283`、caseNone)は「キーなし→初期展開」
  `expanded === 'true'` を要求しており、現行ソースと一致する

`check-minimap.mjs` は `dc7c990`(既定値を開に変更したコミット)より前に書かれた検証であり、変更に
追随していない可能性が高い。このセッションでは両スクリプトを実際に実行して決着させていない(この
ワーカーの Bash 実行は `git show`/`git diff` の読み取りのみに制限されているため)。

**方針**: `check-minimap.mjs` の「初期は閉」チェック1項目は現行仕様の受入条件として採用しない。
初期状態(localStorage キー無し)の受入条件は `check-scrollhint.mjs` の D 節を正とする。
`check-minimap.mjs` 側の当該チェックを更新するか削除するかは、このドキュメントの担当外(検証スクリプト
は `~/dev/.seatmap-port/` にありリポジトリ管理外)。次にこのスクリプトへ触れるセッションで判断する。

## 3. Desktop 空席クリックと HIT 解除(実測で決着済み・回帰しやすい箇所)

`components/TeamOverlay/components/SeatCard.tsx:32-38` の Desktop 空席カードは `<button disabled>`
として描かれる。disabled なフォームコントロールはブラウザが `click` を一切ディスパッチしないため、
素朴な実装のままだとパネル側の highlightSeatId/onClearHighlight ハンドラ
(`components/TeamOverlay/index.tsx:168-171`)にイベントが届かない —
**ソースレビューだけでは発見できない**類のギャップで、実ブラウザでの capture 段リスナー計測で初めて
`clickEventFired: 0件` として確認できた(`check-hit-clear.mjs` case3)。

実測結果(`check-hit-clear.mjs` case3、WIDE/NARROW 両方で実行済み):

| クリック対象 | Desktop | Compact |
|---|---|---|
| HIT席自身 | 維持 | 維持 |
| 別の在席カード | 解除 | 解除 |
| 空席カード | **解除されなかった**(修正前) | 解除 |
| パネル余白 / ヘッダー / ミニマップ | 解除 | 解除 |

**修正**: `components/TeamOverlay/team-overlay-modal.module.css` の `.card.isEmpty` に
`pointer-events: none` を追加し(コメント付き、CSS 側にのみ存在)、クリックを素通しして背後の
グリッド枠(`data-seat-id` を持たない `<div>`)に当てる。ハンドラ側は無変更。

**この修正は CSS のルール1本だけで成立している**。`.card.isEmpty` の宣言を「整理」目的で
書き換えたり `pointer-events` を削ったりすると、この回帰が黙って再発する — ビルドも型チェックも
通り、コンソールエラーも出ない。`check-hit-clear.mjs` の case3 は現状 Desktop 側で固定期待値を置いて
おらず(`disabled === true` の分岐は `clickEventFired`/`cleared` を実測記録するだけ、
`check-hit-clear.mjs:172-181` のコメント「固定期待値を置かず実測のみ記録する」)、修正後の状態が
既に判明した今、この分岐を固定期待値(`cleared === true`)へ強めることを検討する余地がある。ただし
スクリプト自体はリポジトリ管理外のため、この文書では「回帰検知に使える検証手段」として存在を記録する
に留める。

## 4. 検証手段なし

| 項目 | 理由 |
|---|---|
| CSS 特異度の順序依存(`.hint.isFaded` が `.hint.isButton` より後に宣言されている必要がある、`components/TeamOverlay/team-overlay-modal.module.css:383-393`) | 3スクリプトいずれも「見た目のフェード有無」しか見ておらず、宣言順そのものは検査していない。宣言順を入れ替えて `.hint.isFaded` が効かなくなることを確認する専用チェックは無い |
| WKWebView の合成クリック無視(`ViewSeatCell.tsx:71-72`) | 実 Safari の iOS WKWebView 実機以外では再現できない。Playwright(Chromium)では検証不能 |
| StrictMode 二重書き込み回避(`use-minimap-collapse.ts:25-26`) | 開発ビルド固有の挙動で、本番ビルド配信に対する検証では観測できない |
| 横スクロールヒントの `nudge` 量が実際に1列分か | `check-scrollhint.mjs` は `scrollLeft` の増減方向のみ見ており、移動量そのものの一致は見ていない |
| HIT 解除判定が2箇所で二重実行されていること自体(`architecture.md` 9節) | どちらの結果を見ても最終状態(`cleared`)は同じになるため、既存スクリプトの `hitState()` 実測では2箇所どちらが効いたかを区別できない |

## 5. 完了条件との関係

`CLAUDE.md` の完了条件(`npx tsc --noEmit` 通過・`scripts/verify-s1.js` を実行中の画面で PASS・
プッシュ後 GitHub Pages 配信版でも同スクリプト PASS)はリポジトリ共通でありこのドメイン固有ではない。
本書のスクリプトはそれに加えて TeamOverlay ドメイン固有の受入条件を担う、位置づけとして併記する。
