# TeamOverlay — 画面仕様

対象は `components/TeamOverlay/`。チーム箱クリックで開く大型モーダル(座席グリッド Desktop/Compact・
横スクロールヒント・ミニマップ・HIT表示)を扱う。キャンバス側(チーム箱・パンズーム・`.sr-only` ミラー
レイヤー)の仕様は `docs/seat-map/` を見る。社員詳細(EmployeeDetail)の中身もこの文書の対象外 —
「座席クリックで社員詳細が開く」という境界までしか扱わない。

## 0. パネル構成

`index.tsx` の描画順そのまま。上から: ロードバー(読み込み中のみ)→ ハンドル(Compactのみ)→
ヘッダー(チーム名・人数・閉じるボタン)→ 本文(座席配置見出し → 座席グリッド → ミニマップ)。

## 1. 起動・終了

### 起動経路

| 経路 | 呼び出し | ヒット表示 |
|---|---|---|
| チーム箱クリック | `useTeamSeatFocus.openByBoundary`(`highlightSeatId=null`) | 無し |
| 自分の席ボタン / ディレクトリ検索 | `useTeamSeatFocus.focusSeat(seat)`(`highlightSeatId=seat.id`) | 有り |

呼び出し元とデータの流れの詳細は `architecture.md` 5 を見る。

### 終了経路

- 背景クリック(`.team-ovl-backdrop`)
- ラッパー余白クリック(`e.target === e.currentTarget` の時だけ、パネル自身のクリックは
  `stopPropagation` される)
- 閉じるボタン
- Escape — `use-modal-shell.ts` が window 側に置く。DetailPanels が document 段で
  `stopPropagation` して2段スタックの同時クローズを防いでいるため、こちらは必ず window 側
- Compact のみ: 下スワイプ(`useSwipeDismiss`)、ハンドルタップ(`SheetHandle` の `onClose`)

## 2. Desktop / Compact 分岐

境界は 760px(`hooks/use-compact-mobile.ts:5` `COMPACT_MOBILE_QUERY`)。`matchMedia` のみで判定し
`pointerType` やタッチ有無は見ない — **TeamOverlay の唯一の分岐スイッチ**であり、ウィンドウを狭めた
PC も完全にモバイル表示になる(`use-compact-mobile.ts:3-4` のコメント)。

`matchMedia` は React の外にある状態なので `useSyncExternalStore` で購読する(`use-compact-mobile.ts:7-9`)。
以前は `useState` + `useEffect` で「初回は必ず PC 形状 → マウント後に実幅へ差し替え」だったため、モバイル
では初回ペイントが PC 形状になり一瞬ちらついていた。SSR には幅が無いため、サーバー出力と初回クライアント
出力は PC 形状に揃える(`use-compact-mobile.ts:20-22`)。

## 3. 座席グリッド

座席データは絶対座標(x, y)しか持たない。`buildSeatGrid`(`utils/seat-grid.ts:36-50`)が座標をクラス
タリングして行列インデックスを起こす。クラスタ許容差は幅/高さ平均の0.6倍(`utils/seat-grid.ts:41-42`)
— 編集で多少座標がずれても同じ行/列として扱うため。

両グリッドは props が共通(`type.ts:75-85` `SeatGridProps`)だが、描画・入力・スクロール戦略は完全に
別実装(`components/SeatGridFrame.tsx`)。

### Desktop(`components/DesktopSeatGrid.tsx`)

- 列幅固定 180px、gap 10px(`utils/seat-grid.ts:6-7`)
- `seatByGridCell` を row×col で全走査し、座席の無いセルは描かない(`DesktopSeatGrid.tsx:44-47`)
- カードは横並び(アバター左・テキスト右)・フルネーム・`seat.rotation` から椅子の向きを算出
  (`SeatCard.tsx:22-27`)
- 空席は `<button disabled>` として描く(`SeatCard.tsx:32-38`)。この disabled 化が起こす副作用は
  7節を見る
- クリックは `onClick` 直結。スポットライト中(他席をハイライト中)に dimmed 席を押すと HIT 解除、
  それ以外は `onSeatClick`(`DesktopSeatGrid.tsx:63-70`)

### Compact(`components/CompactSeatGrid.tsx`)

- 列幅は可変。6列(`COMPACT_VISIBLE_COLS`)がコンテナ幅にちょうど収まる幅を `ResizeObserver` で実測
  (`CompactSeatGrid.tsx:22-40`)
- `positionedSeats` を row×col の全走査ではなくそのまま `map`(`CompactSeatGrid.tsx:76`)
- セルは縦積み(アバター上・テキスト下)・姓のみ・椅子なし・回転非表示(`ViewSeatCell.tsx:9-10`)
- 姓の切り出しは `utils/display-utils` の `getCompactNameLabel` を再 export するだけで、Compact
  専用の別実装は持たない。元は同名関数がここにも別実装として存在し、あちらだけが Garoon 名の「;所属」
  接尾辞を落とし損ねていた事故があったため一本化した(`utils/compact-name.ts:3-6`)。コード
  コメントは「同じ概念の判定基準を2つ持たない(docs/pitfalls.md 4番)」と根拠を残しているが、
  リポジトリローカルの `docs/pitfalls.md` は現状3項目までしか無く4番は存在しない —
  該当するのはグローバル `~/.claude/rules/03-pitfalls.md` 4番「同一概念の二重判定基準」と見られる
- フォントサイズは 8〜13px 可変。ASCII 9文字以上→8px、和名5文字以上→12px(`utils/compact-name.ts:9-13`)
- 空席は `<div>`(ボタン化しない)。スポットライト中は空席も dimmed で落とす —
  ここを外すと空席だけが最前面の明るさで残り、ヒット席より目立ってしまう
  (`ViewSeatCell.tsx:79-86` のコメント)
- タップはジェスチャー判定つき: pointerdown 起点から 10px 以上動くと無効(`TAP_MOVE_TOLERANCE_PX`)、
  600ms 超の長押しも無効(`TAP_MAX_DURATION_MS`)、慣性スクロールが流れている最中の押下も「止める
  ためのタップ」とみなして無効化(`ViewSeatCell.tsx:26-28,45-53`、`use-scroll-activity.ts`)。
  `detail === 0`(キーボード / スクリーンリーダー由来)は素通しし、pointer 起点の無い `click` は
  WKWebView がスクロール後に合成したものとして無視する(`ViewSeatCell.tsx:65-77`)

## 4. 横スクロールヒント

`components/ScrollHint.tsx`。Desktop / Compact 共用の1コンポーネントで、`onNudge` の有無だけで
表示専用 / ボタンが切り替わる。

- `onNudge` 無し: `<span aria-hidden>`。ポインタを取らず読み上げからも外す(`ScrollHint.tsx:14-21`)
- `onNudge` 有り: `<button>`。1クリックで1列ぶんだけ `scrollBy({ behavior: 'smooth' })` で送る
  (`DesktopSeatGrid.tsx:35-40`、`CompactSeatGrid.tsx:60-62`)。Desktop は列幅固定値
  (`DESKTOP_SEAT_CARD_WIDTH_PX + DESKTOP_SEAT_GAP_PX`)、Compact は実測した `cellWidth` を使う
- 端に達した側(`atStart` / `atEnd`)は **DOM から消さず** `is-faded` クラス + `disabled` 属性を付与
  してフェードアウトする(アンマウントしない、`ScrollHint.tsx:26-30` とグリッド側コメント)
- overflow 判定(`hasOverflow` / `atStart` / `atEnd`)は `scrollWidth` / `clientWidth` / `scrollLeft`
  の実測(`hooks/use-scroll-hints.ts`)。scroll・コンテナリサイズ・列数変化のたびに測り直す

背景は `color-mix(in srgb, var(--glass-bg) 45%, transparent)`(`styles/team-overlay-modal.css:296`)。
`--glass-bg` 自体のアルファがライトテーマで 0.78(`styles/tokens.css:47`)のため、実効アルファは
0.78×0.45 ≈ 0.35。`backdrop-filter: blur(6px) saturate(120%)`(同297行)。

CSS 特異度の順序依存: `.is-faded` は `.is-button` と同じ特異度のため、CSS ファイル内で `.is-button`
より **後** に宣言しないと効かない(`styles/team-overlay-modal.css:325-327` のコメント「後方宣言で
優先(順序依存)」)。

Desktop は以前(commit `e5fa2de` 以前)ヒントが表示専用だった。列幅 180px 固定のため狭い画面ではヒット
席が横スクロール外に出る実測(幅900pxで492px、幅800pxで592pxあふれ、`scrollLeft` は0のまま)があり、
Compact と同じ実測ベースのフックで追従させるためボタン化した(`DesktopSeatGrid.tsx:27-28`)。

## 5. HIT表示(ハイライト)

`highlightSeatId` は TeamOverlay 自身が持つ状態ではなく、呼び出し元(`useTeamSeatFocus`)から props
として渡ってくるだけ(所有関係の詳細は `architecture.md` 5-6)。

- ヒット席へは開いてから 360ms 後(クリックロック解除に合わせる)にスクロール追従し、prefers-reduced-
  motion なら `behavior: 'auto'`、それ以外は `'smooth'`(`hooks/use-seat-highlight-animation.ts:11,26-29`)。
  遅らせる理由が2つ重なっている: (1) 子の effect は親より先に走るので、遅延無しだと親
  `useOverlaySession` の `bodyRef.scrollTop = 0` に打ち消される (2) パネル自身が拡大アニメーション中で、
  変形中の祖先の下では smooth スクロールの着地点がずれる(同ファイル7-10行のコメント)
- glow 演出は 2200ms(reduced-motion 時は420ms)(`use-seat-highlight-animation.ts:5-6`)。Compact の
  カードだけがこの `glowing` を使う。Desktop カードは枠+リング+影+HITバッジを既に持つため使わない
  (`DesktopSeatGrid.tsx:29-30` のコメント)
- 解除条件: **ヒット席自身以外のクリック**。パネル全体の `onClick` でクリック先の
  `closest('[data-seat-id]')` を取り、その `dataset.seatId` が `highlightSeatId` と不一致なら
  `onClearHighlight` を呼ぶ(`index.tsx:80-89`)。ヒット席自身のクリックは除外する — 社員詳細を開く
  経路(`onSeatClick`)と競合するため
- 元の不具合(commit `bd5144d` で修正): 座席以外(空白・ヘッダー・ミニマップ等)をクリックしても
  ハイライトが消えなかった。修正前は `onClick={(e) => e.stopPropagation()}` だけで、解除判定自体が
  存在しなかった

判定コードは実装上もう1箇所ある(座席セルの `onSelect` の `dimmed` 分岐)。両者は最終的に同じ基準
(`seat.id !== highlightSeatId`)を使っており矛盾は無いが、詳細と保守上の注意点は `architecture.md` 9
を見る。

## 6. ミニマップ

`components/Minimap.tsx` + `MinimapFigure.tsx`。オーバーレイ本文の折りたたみ式セクションで、座席
グリッドの下に置く**表示専用**(画面隅に常駐するナビゲーション用ミニマップではない。タップしても
移動しない、`Minimap.tsx:7-8`)。

### 開閉

既定は**展開**。開閉状態は `localStorage['seatmap::minimap-open']` に保存し、別チームを開いても
引き継ぐ(`hooks/use-minimap-collapse.ts:3`)。保存値が無ければ展開、`'false'` なら折りたたみ
(`use-minimap-collapse.ts:7-11`)。

commit `dc7c990` で既定を閉→開に変更した。変更前は「オーバーレイを開いた瞬間に主役(座席グリッド)が
押し下げられないように」既定閉だったが、変更後は「保存値が無ければ展開状態で見せる(閉じたい場合は
明示的にトグルさせる)」という理由に置き換わっている(`use-minimap-collapse.ts:3-4` の現行コメント)。

トグル関数は次の値を外で決めてから `setState` と保存を並べる。更新関数の中で保存すると StrictMode の
二度呼びで書き込みも二度走るため(`use-minimap-collapse.ts:25-26`)。

閉じている間は中身の DOM を作らない(`display:none` ではなく非描画、`Minimap.tsx:43-44`)。

### 図

- 図形群は装飾扱いで `aria-hidden` かつ `pointer-events` を持たない。代替として `sr-only` の1文
  (「〇〇のフロア内の位置を示す図です」)だけを読ませる(`Minimap.tsx:34,47`、`MinimapFigure.tsx:5-6,60`)
- 切り取り窓(`worldBounds`)は現在チームを中心に viewBox×(100/35)倍で取り、viewBox の内側へ
  クランプする。窓が viewBox より大きければ全域に退化する — このデモの 1600×1154 はその状態で、
  会議室まで含めてフロア全体が入る(`hooks/use-minimap-data.ts:9-10,43-45`)
- viewBox が無いフロア向けのフォールバックは、描画対象を全て囲む bounding box に余白(辺の4%、
  最低24px)を足す(`use-minimap-data.ts:56-77`)
- 現在地の十字線は窓が viewBox 内へクランプされる結果、端のチームでは中心が 0.5 にならない。0〜1
  にクランプして枠外へ飛ばないようにする(`use-minimap-data.ts:92-93`)
- ラベルは枠に対する幅/高さ比で文字数(9/11/14)とフォントサイズ(8/9/10px)を3段階で決め、超過分は
  `…` で詰める(`utils/minimap-label.ts:9-17`)。最小描画サイズは2px(潰れると矩形自体が見えなく
  なるための下駄、`minimap-label.ts:3-4`)
- `Minimap` 自体は `memo` 化されており、オーバーレイ側のスクロール・ハイライト状態の更新では
  再描画されない(`Minimap.tsx:56-57`)

## 7. 空席クリックと HIT 解除(Desktop の既知の穴と修正)

Desktop の空席カードは `<button disabled>` として描かれる(`SeatCard.tsx:32-38`)。disabled な
フォームコントロールはブラウザが `click` イベントを一切ディスパッチしないため、素朴な実装のままだと
クリックがパネル側の HIT 解除ハンドラ(5節)まで届かない。

実測(`~/dev/.seatmap-port/check-hit-clear.mjs` case3、WIDE 1280×900 / NARROW 390×844 の両方で
全ケース実行済み):

| クリック対象 | Desktop | Compact |
|---|---|---|
| HIT席自身 | 維持(仕様どおり) | 維持(仕様どおり) |
| 別の在席カード | 解除 | 解除 |
| 空席カード | **解除されなかった**(修正前) | 解除 |
| パネル余白 / ヘッダー / ミニマップ | 解除 | 解除 |

Compact の空席セルは非 disabled な `<div>`(`ViewSeatCell.tsx:79-86`)で `data-seat-id` を持つため、
5節のパネル判定に普通に乗り解除される。Desktop だけが disabled ボタンの click 非発火という
ブラウザ挙動に引っかかっていた。

**修正**: `styles/team-overlay-modal.css` の `.team-ovl-card.is-empty` に `pointer-events: none` を
追加し、クリックを素通しさせて背後のグリッド枠(`data-seat-id` を持たない `<div>`)に当てる。ハンドラ
側(`index.tsx`)は無変更 — `closest('[data-seat-id]')` が `null` を返し `highlightSeatId` と不一致
になるため、既存の解除ロジックがそのまま働く。

この修正は CSS 側だけで成立しており、`.team-ovl-card.is-empty` のルールを後から編集すると挙動が
静かに壊れ得る。検証手段としての位置づけは `testing.md` 3 を見る。
