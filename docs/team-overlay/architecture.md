# TeamOverlay — 構成・データフロー

対象は `components/TeamOverlay/`。フォルダ構造は `docs/authoring.md` 5.2 の `<Name>/index.tsx` パターン
に準拠する(公開物はちょうど1つ = `TeamOverlay` コンポーネント自身)。画面仕様は `spec.md`、検証手段は
`testing.md` を見る。

## 1. フォルダ構成

```
components/TeamOverlay/
├─ index.tsx                     組み立てのみ。開閉配線・HIT クリア判定
├─ type.ts                       このツリー全体で共有する型(平坦)
├─ components/
│  ├─ CompactSeatGrid.tsx        Compact 座席グリッド
│  ├─ DesktopSeatGrid.tsx        Desktop 座席グリッド
│  ├─ Minimap.tsx                ミニマップの開閉トグルと aria 配線
│  ├─ MinimapFigure.tsx          ミニマップの図形描画
│  ├─ ScrollHint.tsx             横スクロールヒントの共用部品
│  ├─ SeatCard.tsx               Desktop 座席カード
│  ├─ SeatGridFrame.tsx          Desktop/Compact の分岐点
│  ├─ SeatLayoutHeader.tsx       座席配置セクションの見出し
│  ├─ TeamOverlayHeader.tsx      パネルヘッダー
│  └─ ViewSeatCell.tsx           Compact 座席セル
├─ hooks/
│  ├─ use-compact-mobile.ts          760px 境界の判定
│  ├─ use-minimap-collapse.ts        ミニマップ開閉状態(localStorage 永続化)
│  ├─ use-minimap-data.ts            ミニマップの切り取り窓・現在地の純粋計算
│  ├─ use-modal-shell.ts             body スクロールロック・Escape・フォーカストラップの束ね
│  ├─ use-overlay-session.ts         開いた直後のローディング演出・クリックロック
│  ├─ use-scroll-activity.ts         document 捕捉段のスクロール中判定
│  ├─ use-scroll-hints.ts            横スクロールの実測(overflow/atStart/atEnd)
│  └─ use-seat-highlight-animation.ts ヒット席への追従スクロールと glow 演出
└─ utils/
   ├─ anchor-origin.ts           拡大原点(transform-origin)計算
   ├─ compact-name.ts            Compact 氏名ラベルとフォントサイズ
   ├─ minimap-label.ts           ミニマップラベルの文字数・省略
   └─ seat-grid.ts               グリッド寸法定数と行列インデックス計算
```

## 2. コンポーネント責務

| ファイル | 責務 |
|---|---|
| `index.tsx` | Props 受け取り・開閉/スワイプ/フォーカストラップの配線・HIT クリア判定(`index.tsx:80-89`)。状態・計算・分岐はほぼ持たない |
| `SeatGridFrame.tsx` | `isCompactMobile` で `DesktopSeatGrid` / `CompactSeatGrid` を選ぶだけ |
| `DesktopSeatGrid.tsx` | 固定列幅グリッド・`onClick` 直結・横スクロールヒント配線 |
| `CompactSeatGrid.tsx` | 可変列幅グリッド(`ResizeObserver` 実測)・タップ誤爆ガード配線・横スクロールヒント配線 |
| `SeatCard.tsx` | Desktop 座席カード(横並び・フルネーム・椅子あり)。空席は disabled button |
| `ViewSeatCell.tsx` | Compact 座席セル(縦積み・姓のみ・椅子なし)。タップ状態機械を自前で持つ。空席は非 disabled な `<div>` |
| `ScrollHint.tsx` | Desktop/Compact 共用。`onNudge` の有無で表示専用/ボタンを切替 |
| `TeamOverlayHeader.tsx` | チーム名・人数・閉じるボタン |
| `SeatLayoutHeader.tsx` | 座席配置セクションの見出しと同期状態表示 |
| `Minimap.tsx` | ミニマップの開閉トグル・aria 配線・`memo` 化 |
| `MinimapFigure.tsx` | ミニマップの図形そのもの。純粋な表示、`pointer-events` 無し |

## 3. フック責務

| ファイル | 責務 | 状態の種類 |
|---|---|---|
| `use-compact-mobile.ts` | 760px 境界判定 | `useSyncExternalStore`(matchMedia を外部ストアとして購読) |
| `use-modal-shell.ts` | body スクロールロック・Escape 閉じ・フォーカストラップの束ね | 副作用のみ(状態は持たない) |
| `use-overlay-session.ts` | 開いた直後のローディング演出・クリックロック・本文スクロール位置リセット | `useState`(loading/clickLocked/syncedAt) |
| `use-scroll-hints.ts` | 横スクロールの実測(`scrollWidth`/`clientWidth`/`scrollLeft`) | `useState` + `useLayoutEffect`(依存配列無し、毎コミット後に同期再測定) |
| `use-scroll-activity.ts` | document 捕捉段のスクロール中判定(Compact 用) | `useRef`(再レンダーを起こさない) |
| `use-seat-highlight-animation.ts` | ヒット席への追従スクロールと glow 演出 | `useState`(glowing) |
| `use-minimap-collapse.ts` | ミニマップ開閉状態 | `useState` + `localStorage` |
| `use-minimap-data.ts` | ミニマップの切り取り窓・現在地の計算 | 無し(純粋計算、`useMemo` のみ) |

## 4. utils 責務

| ファイル | 責務 |
|---|---|
| `seat-grid.ts` | グリッド寸法定数(列幅・gap・パディング)と、絶対座標→行列インデックスへの変換 |
| `anchor-origin.ts` | クリックしたバウンダリ中心からの拡大原点(`transform-origin`)計算 |
| `compact-name.ts` | Compact 氏名ラベル切り出し(`lib/seat/display-utils` へ委譲)とフォントサイズ計算 |
| `minimap-label.ts` | ミニマップラベルの文字数・フォントサイズ・省略記号処理 |

## 5. props の流れ

`TeamOverlay` 自身は `payload` / `highlightSeatId` を**状態として持たない**。両方とも呼び出し元
`components/SeatMapView` の `useTeamSeatFocus`(`components/SeatMapView/hooks/use-team-seat-focus.ts`)
が `useState` で保持し、props として渡ってくるだけ(`type.ts:43-57` `TeamOverlayProps`)。

```
SeatMapView
 └ useTeamSeatFocus() → { payload, highlightSeatId, close, clearHighlight, focusSeat, openByBoundary }
 └ <TeamOverlay
      payload={focus.payload}
      seats={effectiveLayout.seats}
      employeeById / presenceMap
      onClose={focus.close}
      onSeatClick={openSeatDetail}
      highlightSeatId={focus.highlightSeatId}
      onClearHighlight={focus.clearHighlight}
      minimapAreas / minimapFurniture / minimapTeamArea / minimapViewBox
   />
```
(`components/SeatMapView/index.tsx:198-211`)

起動元は2系統で、`highlightSeatId` の有無だけが違う:

- チーム箱クリック → `openByBoundary(payload)`。`highlightSeatId` は `null`
  (`use-team-seat-focus.ts:66-70`)
- 自分の席ボタン / ディレクトリ検索 → `focusSeat(seat)`。`payload` はチーム箱の DOMRect を
  `canvasRef.current.measureTeamRect` で測って作り、`highlightSeatId` は `seat.id`
  (`use-team-seat-focus.ts:34-57`)

`payload.rect` はキャンバス側(`docs/seat-map/` の対象)が測定した DOMRect をそのまま使う
(`use-team-seat-focus.ts:43`)。座席クリックは `onSeatClick` を経由して `useDetailPanel().openSeatDetail`
に渡り、社員詳細(EmployeeDetail、別ドメイン)を開く(`components/SeatMapView/index.tsx:48,204`)。
TeamOverlay はこの先に踏み込まない。

## 6. 状態がどこに住むか

| 状態 | 保持場所 | 永続化 |
|---|---|---|
| `payload` / `highlightSeatId` | 親 `useTeamSeatFocus`(`useState`) | 無し |
| `loading` / `clickLocked` / `syncedAt` | `useOverlaySession`(TeamOverlay 配下) | 無し |
| `hasOverflow` / `atStart` / `atEnd` | `useScrollHints`(各グリッド配下) | 無し |
| ミニマップ開閉 | `useMinimapCollapse` | `localStorage['seatmap::minimap-open']` |
| ヒット席の glow 演出 | `useSeatHighlightAnimation` | 無し |
| Compact 慣性スクロール中フラグ | `useScrollActivity`(`useRef`) | 無し |
| Desktop/Compact 判定 | `useIsCompactMobile`(`useSyncExternalStore`) | 無し(`matchMedia` の現在値を都度読む) |

TeamOverlay ツリーの中で `localStorage` に触れるのは `useMinimapCollapse` だけ。他はすべて
コンポーネントのライフサイクルに閉じた一時状態。

## 7. 座席グリッドのデータフロー

```
payload.teamId
  → seats.filter(s => s.teamId === payload.teamId)   // teamSeats (index.tsx:49-52)
  → buildSeatGrid(teamSeats)                          // SeatGrid { positionedSeats, seatByGridCell, rows, cols }
  → SeatGridFrame(isCompactMobile で分岐)
      → DesktopSeatGrid  (seatByGridCell を row×col 全走査)
      → CompactSeatGrid  (positionedSeats をそのまま map)
```

`teamSeats` / `grid` / `occupiedCount` はいずれも `useMemo`(`index.tsx:49-54`)。フィルタ基準は
`seat.teamId` 一本 — キャンバス側の絞り込みと同じ基準を使う(`use-team-seat-focus.ts:41` のコメント)。

## 8. ミニマップのデータフロー

`minimapAreas` / `minimapFurniture` / `minimapTeamArea` / `minimapViewBox` はいずれも
`SeatMapView` 側で計算済みの値を props で受け取るだけで、TeamOverlay 内では座標計算をしない
(`type.ts:52-56` のコメント「全て任意で、渡さなければミニマップ自体を描かない」)。

```
props (areas, furniture, currentArea, viewBox)
  → useMinimapData()   // 純粋計算: worldBounds(切り取り窓) / currentCenter(現在地) / drawAreas / drawFurniture
  → MinimapFigure       // 百分率で JSX に変換するだけ
```

`Minimap` は `memo` 化されており、オーバーレイ側のスクロール・ハイライト状態の更新では再描画されない
(`components/Minimap.tsx:56-57`)。props(area/furniture/currentArea/viewBox)が変わらない限り、
同じチームを開いている間は座席側の頻繁な状態変化から隔離されている。

## 9. HIT 解除判定は実装上2箇所にある

「ヒット席以外のクリックで解除」という同一の判定(`seat.id !== highlightSeatId`)が、コード上は2箇所
に分かれて存在する。

1. 座席セル自身の `onSelect`(`DesktopSeatGrid.tsx:63-70`、`CompactSeatGrid.tsx:93-98`)—
   `dimmed`(= `spotlight && !isHit`、`isHit = highlightSeatId === seat.id`)なら `onClearHighlight`
   を呼びクリック本体(`onSeatClick`)は無視する
2. パネル全体の `onClick`(`index.tsx:80-89`)— クリック先の `closest('[data-seat-id]')` の ID が
   `highlightSeatId` と不一致なら `onClearHighlight`

他の座席セルをクリックした場合、React のイベントバブリングにより両方が実行される(1が先、2が後。
2 は 1 が呼んだ `setState` がまだ反映されていない同じイベント内で走るため、古い `highlightSeatId` を
見て再度同じ判定をする)。どちらも同じ基準を使っており今のところ矛盾は無く、`onClearHighlight` 自体
も冪等なので実害は無い。ただし判定基準そのものは2箇所に存在するため、将来どちらか一方だけを変更すると
`~/.claude/rules/03-pitfalls.md` 4番「同一概念の二重判定基準」と同型の不整合を起こし得る。座席セルを
経由しないクリック(空白領域・ヘッダー・ミニマップ等)は 2 のみが働く。

7節の Desktop 空席修正(`.team-ovl-card.is-empty { pointer-events: none }`)は、この2つの判定のうち
2(パネル全体の `onClick`)にクリックを届かせるための CSS 側の迂回であり、1・2 の判定ロジック自体は
変更していない。

## 10. 境界

- キャンバス側(チーム箱測定・パンズーム・`.sr-only` ミラー)は `docs/seat-map/` を見る
- 社員詳細(EmployeeDetail)の中身はこの文書の対象外。`onSeatClick` の先で開く、という境界までしか
  扱わない
