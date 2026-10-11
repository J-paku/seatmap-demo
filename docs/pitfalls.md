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
確認法: `npm run build` の後、`out/_next/static/` の下の CSS を直接開いて、標準の宣言が残っているかを見る。

**残存バグは解消済み**: かつて `.schedule-loading-overlay` に残っていた手書きの
`-webkit-backdrop-filter` は `fd10b88` で削除した。`src/styles/` 全体を検索しても、
標準宣言とベンダープレフィックスを両方手で書いている箇所は無い。

## 2. `src/lib/mock-loader.ts` の localStorage キャッシュ

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

**原因**: `scripts/verify-s1.js` などの判定は実行中の画面(ブラウザ)で走らせる検証スクリプトで、
E2E(`tests/`)が画面状態を作ってから注入する。`npm run typecheck` はコンパイル時の型検査であり、
実行時の DOM/ブラウザAPI挙動は検査しない。

**なぜレビューで拾えないか**: ソースコードのレビューや型チェックは静的解析であり、pointer capture の
リターゲット・`Element.scrollTo`・`pointerup → click` 合成のようなブラウザ固有の実行時挙動を再現しない。
単体テストの環境(node・happy-dom)の結果もこれらの代わりにならない。

**回避法**: `npm run build` の後に E2E(`npm run test:e2e`)を走らせる。ローカル PASS だけで完了と言わず、
push 後の配信版でも同じ E2E を走らせる(`docs/agents/verification.md` の完了の条件)。
2026-10-12 までは Playwright をリポジトリに置かず、運転台を手で走らせていた(`docs/decisions/0003-playwright-e2e.md`)。

## 4. CSS Modules 化でカスケード順が逆転し、負けていた宣言が勝つ

**症状**: `team-overlay-modal.css`(当時のルートの styles フォルダにあったグローバル CSS。現在は
`src/components/TeamOverlay/team-overlay-modal.module.css`)をモジュール化しただけで、オーバーレイの
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

## 6. 保存済みの値が今の表に無いと、その画面だけ落ちる(アバターの古いプリセット id)

**症状**: アバターのカスタマイザを開くと「Cannot read properties of undefined (reading 'palette')」で落ちる。
新しいブラウザでは再現しない。

**原因**: 保存されたアバターの preset の id をそのまま使ってプリセットの表を引いていた。今は表に無い id が
`localStorage` に残っていると、引いた結果の `undefined` を読む。

**なぜレビューで拾えないか**: 古い id を持つブラウザでしか起きない(2番と同じ状態依存)。単体テストも
今の表にある id だけで書くと通る。

**回避法**: 保存から読んだ値は、今の表にあるかを確かめてから使い、無ければ既定へ置き換える(`c8b5391` では
解決後のパーツと色が一致するプリセットから逆引きし、無い id は既定のプリセットで開く。全 id を回すテストを足した)。
保存の形や表を変えるときは、古い値を `localStorage` に書いてから新しいコードで開いて確かめる。

## 7. 外から来たオブジェクトのキーが `hasOwnProperty` を隠す

**症状**: AI 取り込みで、palette に `hasOwnProperty` というキーがあると「palette.hasOwnProperty is not a function」が
取り込みの外へ漏れて落ちる。

**原因**: マスクの透明度の集計が `palette.hasOwnProperty(char)` を呼んでいた。入力の JSON にそのキーがあると、
メソッドが文字列で隠れる。

**なぜレビューで拾えないか**: 普通の入力では起きない。キーの名前しだいで壊れる。

**回避法**: 外から来たオブジェクトのキーの有無は `Object.hasOwn(obj, key)` で見る(`cb71848`)。入力のオブジェクトの
メソッドを呼ばない。

## 8. Playwright のブラウザを入れると、他のリポジトリのブラウザが消える

**症状**: このリポジトリで `npx playwright install chromium` を走らせた後、同じ機械の別のリポジトリ
(J-paku.github.io など)の E2E が、ブラウザの実行ファイルが無いと言って走らなくなる。

**原因**: ブラウザは `~/.cache/ms-playwright` を全リポジトリで共有する。install は `~/.cache/ms-playwright/.links` に
登録された各リポジトリの playwright-core を見て、どの登録も使わない版のブラウザを消す。登録先に playwright-core が
無い(リポジトリを移した・消した)登録は壊れた登録として捨てられ、その版のブラウザも消える
(playwright-core の `_validateInstallationCache`)。版はリポジトリごとに違う(2026-10-12 時点で、このリポジトリは
1.64.0 で chromium-1248、J-paku.github.io は 1.63.0 で chromium-1243)。

**なぜレビューで拾えないか**: 入れた側のリポジトリの E2E は通る。壊れるのは別のリポジトリで、次にそちらで
走らせるまで気付かない。

**回避法**: リポジトリを移したら、それぞれのリポジトリで1回 `npx playwright install chromium` を走らせて登録を
作り直す。入れた後は `ls ~/.cache/ms-playwright` で他のリポジトリの版が残っているかを見る。

## 9. worktree の下で Prettier の検査が黙って0件で通る

**症状**: `.claude/worktrees` の下の worktree のファイルを `npx prettier --check` で見ると、書式が崩れていても
「All matched files use Prettier code style!」と出て終了コード0で通る。

**原因**: Prettier は既定で、走らせた場所(cwd)の `.gitignore` を ignore として読む。そこに `.claude/` や
`/.claude/worktrees/` があると worktree の下のファイルは検査から外れ、検査0件のまま成功で終わる。
2026-10-12 に、J-paku.github.io(`.gitignore` に `.claude/` がある)を cwd にしてこの worktree の書式の崩れた
`scripts/check-docs.mjs` を検査すると通り、`--ignore-path /dev/null` を付けると同じファイルが落ちた。

**なぜレビューで拾えないか**: 外れたときの出力は、本当に通ったときと同じ文言で、外れたファイルの数は出ない。

**回避法**: worktree のファイルを確かめるときは `--ignore-path /dev/null` を付ける。新しく使う検査は、
一度わざと崩して落ちるのを見てから信じる。

## 10. Stryker は走らせた場所を基準に動く

**症状**: worktree の変更を変異テストで確かめたつもりが、別のチェックアウトのコードを測った結果が出る。

**原因**: Stryker は設定の対象(`src/...` の相対パス)・作業用の写し・前回の結果のファイル
(`stryker.config.mjs` の `incrementalFile`)を、走らせた場所(cwd)を基準に解く。

**なぜレビューで拾えないか**: 結果は普通の成功・失敗と同じ形で出る。どのチェックアウトを測ったかは、
出力のパスを読まないと分からない。

**回避法**: 検査したいチェックアウト(worktree ならその worktree)の直下を cwd にして `npm run test:mutation` を走らせる。
