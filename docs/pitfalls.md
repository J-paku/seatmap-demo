# pitfalls.md — このリポジトリ固有の落とし穴

累積型。事故が起きるたびに項目を追加する。各項目: 症状 / 原因 / なぜレビューで拾えないか / 回避法。

## 1. Tailwind v4(Lightning CSS)の自動ベンダープレフィックス付与

**症状**: `-webkit-backdrop-filter` を手で書いたブロックだけ、対応ブラウザでも効果が丸ごと死ぬ。

**原因**: 本リポジトリは `@tailwindcss/postcss` を使い、ビルドが標準プロパティへ自動でベンダープレフィックスを
付ける。標準プロパティだけ書けば `-webkit-` + 標準の両方が生成されるが、**標準と `-webkit-` を両方手で書くと、
標準宣言の方が산출물(ビルド成果物)から消える**。最新 Chromium は `-webkit-backdrop-filter` 単体を
サポートしないため、効果が丸ごと死ぬ。

**なぜレビューで拾えないか**: ソースコードだけ見ると正常(両方書いてあるので「念のため」に見える)。
ビルド成果物を直接見ないと発覚しない。

**回避法**: 標準プロパティのみ書く。手動でベンダープレフィックスを追加しない。
確認法: `curl http://localhost:3100/_next/static/chunks/styles_globals_*.css` で成果物を直接見る。

**残存バグは解消済み**: かつて `.schedule-loading-overlay` に残っていた手書きの
`-webkit-backdrop-filter` は `fd10b88` で削除した。`styles/` 全体を検索しても、
標準宣言とベンダープレフィックスを両方手で書いている箇所は無い。

## 2. `lib/mock-loader.ts` の localStorage キャッシュ

**症状**: モックデータを直したのに、古いキャッシュが残ったブラウザでだけ表示が壊れる。新しいブラウザでは再現しない。

**原因**: `seatmap::<name>` キーでモックデータを localStorage にキャッシュする。現在はシード指紋
(`fingerprintOf`)を同梱し、シードが変わると自動で無効化される構造になっているが、**この構造を知らずに
モックデータだけを直すと**、旧指紋のキャッシュが残るブラウザでのみ壊れた表示になる。

**実際の事故**: 座席 id が `seat-001` → `dept-sales-001` に変わった後、旧キャッシュが残ったブラウザで
チーム全員の人数が `0名` と表示された。

**なぜレビューで拾えないか**: 開発者の新しいブラウザ/シークレットウィンドウでは再現しない。状態依存のバグ。

**回避法**: モックデータの構造(id 体系など)を変える際は `Object.keys(localStorage).filter(k =>
k.startsWith('seatmap::'))` でキャッシュの有無を確認する。シード指紋の仕組み自体は壊さない。

## 3. 検証スクリプトの位置と実行法

**症状**: 型チェックだけ通しても「完了」と判断してしまう。

**原因**: `scripts/verify-s1.js` は実行中の画面(ブラウザ)で走らせる検証スクリプトで、`CLAUDE.md` の
完了条件に含まれる。`npx tsc --noEmit` はコンパイル時の型検査であり、実行時の DOM/ブラウザAPI挙動は
検査しない。

**なぜレビューで拾えないか**: ソースコードのレビューや型チェックは静的解析であり、pointer capture の
リターゲット・`Element.scrollTo`・`pointerup → click` 合成のようなブラウザ固有の実行時挙動を再現しない。
Playwright 実測ハーネスはリポジトリに常設せず、セッションごとに scratchpad に作る運用のため、jsdom
(ユニットテスト環境)の結果は信頼しない。

**回避法**: `scripts/verify-s1.js` を実行中の画面で走らせ `verdict: "PASS"` を確認する。ローカル PASS
だけで完了と言わず、プッシュ後の配信版でも同じスクリプトを走らせる(`CLAUDE.md` 完了条件を参照)。

## 4. CSS Modules 化でカスケード順が逆転し、負けていた宣言が勝つ

**症状**: `styles/team-overlay-modal.css`(当時のグローバル CSS。現在は
`components/TeamOverlay/team-overlay-modal.module.css`)をモジュール化しただけで、オーバーレイの
アイコン8種が26px から 14〜22px へ縮んだ。ソースの数値は一行も変えていない。

**原因**: `.sectionIcon { font-size: 18px }` と グローバルの `.material-symbols-outlined
{ font-size: 26px }` は**詳細度が同じ(0,1,0)**。グローバル CSS だった頃は `globals.css` 本体の
ユーティリティ定義が `@import` より後に来るため後勝ちで 26px が適用されていた。モジュール化すると
CSS チャンクが `globals.css` より後に読まれるので、同じソースのまま勝敗が入れ替わる。

該当したのは `sectionIcon` `editcardHandle` `emptycellIcon` `trashZoneIcon` `seatDragGhostIcon`
`dockSaveIcon` `seatAddIcon` `rotationGripIcon` の8クラス。いずれも `font-size` だけが競合していた。

**なぜレビューで拾えないか**: 移行の diff はクラス名の置換だけで、数値も宣言も足していない。
「純粋な移行」に見える。勝敗は2つのファイルを並べて詳細度と読み込み順を計算しないと分からない。

**回避法**: グローバルユーティリティ(`.material-symbols-outlined` `.icon-msr-filled` `.pixel-btn`)と
併用するクラスをモジュール化する時は、**そのユーティリティが宣言しているプロパティの一覧と突き合わせる**。
重複していたら、移行では宣言を落として従来の見た目を保つ(見た目を変えるなら別コミットにする)。
規則は `docs/styling.md` の「グローバルユーティリティと同じプロパティを宣言しない」。

検出は目視ではなく実測で行う。移行前後で同じ状態を撮って computed style を突き合わせる
(`~/dev/.seatmap-port/capture-css-migration.mjs` / `compare-css-migration.mjs`)。
ただし**撮る状態に対象画面が含まれていなければ差は出ない** — B5 では当初 TeamOverlay の編集モードが
状態一覧に無く、8件のうち1件しか検出できていなかった。

## 5. ハネスのハッシュ名セレクタは、モジュール名まで固定しないと他モジュールを掴む

**症状**: `check-minimap.mjs` が `:is([class$="__panel"],[class*="__panel "])` で待ち続けてタイムアウト。
`locator resolved to 2 elements` と出て、1件目に `layout-switcher-module__jrhJ2W__panel` が来ていた。

**原因**: CSS Modules の生成名は `<ファイル>-module__<ハッシュ>__<キー>`。キーだけを末尾固定しても、
別のモジュールが同じキー名を持てば一致してしまう。実測で `panel` `body` `card` `close` `handle`
`header` `hint` `hit` `title` `backdrop` `isCompact` `isCurrent` `isEmpty` `isSelected` の
15キーが複数モジュールに存在した。

**なぜレビューで拾えないか**: セレクタ単体は正しく見える。衝突は他モジュールの中身を知らないと分からず、
しかも**後から別モジュールにキーが増えた時点で壊れる**ので、書いた時点では通ってしまう。

**回避法**: モジュール接頭辞とキー末尾の両方を固定する。

```js
const k = (key) =>
  `[class*="team-overlay-modal-module__"]:is([class$="__${key}"],[class*="__${key} "])`
```

末尾固定を省くと `__cell` が `__cellName` `__cellStatus` まで拾う。接頭辞を省くと上記の衝突が起きる。
どちらも要る。詳細は `docs/styling.md` の「検証ハネスのセレクタ」。
