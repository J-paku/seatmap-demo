# spec.md — 座席マップキャンバスの画面仕様

対象は `components/SeatMapCanvas/`(`components/SeatMapView/` から1インスタンスだけ描画される)。
チームバウンダリをクリックした先の大型オーバーレイの中身(社員カード・HIT表示・ミニマップ)は
このドキュメントの範囲外。`docs/team-overlay/`(別ドキュメント)を参照する。

不変ルールの正本は `CLAUDE.md`。本書はその上に立つ「画面から見た挙動」だけを持つ。

## 1. キャンバスの構成要素

`SeatMapCanvas/index.tsx` が描く DOM 順(z順、後勝ち)。

| 層 | 内容 | 実装 |
|---|---|---|
| 1 | チームアイランド(バウンダリ) | `TeamAreaLayer` → `TeamArea` |
| 2 | 会議室・電話ブース・共用部・通路 | `FacilityBlock`(`layout.facilities` を map) |
| 3 | 家具(壁・柱・階段・ドア・窓・ソファ等) | `FurnitureBlock`(`layout.furniture` を map) |
| 4 | (編集モードのみ)会議室・家具の操作面 | `EditObjectLayer` |
| 5 | (編集モードのみ)整列ガイド線 | `AlignmentGuides` |

1〜5 は `data-canvas-transform-layer="true"` の1枚のレイヤー(`components/SeatMapCanvas/index.tsx:125`)
に収まり、パン・ズームで一括変換される。ズームボタン・sr-only 座席ミラーはこの変換レイヤーの外
(`SeatMapCanvas` 内だが変換 `div` の兄弟)にあり、画面に固定される
(`components/SeatMapCanvas/index.tsx:192-199`)。「自分の席」ボタン(`MySeatButton`)は
`SeatMapCanvas` 自体の外——`SeatMapView` が閲覧モード時のみ直接マウントする独立コンポーネントで、
キャンバスの変換には一切触れない(`components/SeatMapView/index.tsx:188`)。

閲覧モードでは 4〜5 は描画されない。**個人座席カードは閲覧・編集どちらのモードでもキャンバスに
出ない**——`CLAUDE.md` 不変ルール1に例外は無い。座席へのアクセス経路は 5章(`SeatMirrorLayer`)を参照。

## 2. パン・ズーム操作

変換モデル(`Transform = { scale, translateX, translateY }`)は `useViewport`
(`components/SeatMapCanvas/hooks/use-viewport.ts`)が1本で持ち、DOM の `transform` へ直接書き込む
(再レンダーはジェスチャー終了時のスナップショット更新だけに絞る、同ファイル18-19行のコメント)。

| 操作 | 入力 | 挙動 | 実装 |
|---|---|---|---|
| 1本指パン | ポインタドラッグ | 8px 超で確定しキャンバスを平行移動。指を離すと直近4フレームの平均速度で慣性スクロール(最低速度 1.5px/frame 未満は慣性なし) | `use-canvas-pointer.ts:12,17-19`, `utils/anim-step.ts`(`FRICTION=0.92`, `STOP_SPEED=1.5`) |
| タップ(移動量8px以下) | 1本指クリック | チーム箱等の `onClick` へ委譲(パン確定と排他) | `use-canvas-pointer.ts:79-98,133-155` |
| ダブルタップ/ダブルクリック | 同一地点300ms以内・40px以内で2回 | ズーム済みなら基準倍率へ、そうでなければ+1レベル(×2)にトグル | `use-canvas-pointer.ts:14-15,101-112` |
| 2本指ピンチ | 2ポインタの距離変化 | 中点を基点に拡大縮小。上下限を20%まで超過許容し(オーバースクロール)、離すとバウンドして復帰 | `use-pinch-zoom.ts:13-14,45-55,66-79` |
| 2本指タップ | ピンチ開始→250ms以内・倍率変動が log2 で0.07以下のまま終了 | -1レベル(÷2)ズーム | `use-pinch-zoom.ts:10-11,61-65` |
| ホイール | `wheel` イベント(`ctrlKey`無し) | カーソル位置基点でレベルズーム。1ノッチ=100px相当、行スクロールは33px換算 | `use-viewport-input.ts:9-14,74-81` |
| トラックパッドピンチ | `wheel` + `ctrlKey` | 即時ズーム(慣性を挟まない)。70px=1レベル | `use-viewport-input.ts:11-12,74-76` |
| キーボード `+`/`-` | フォーカスが input/textarea/select 以外 | 画面中央基点で±1レベル | `use-viewport-input.ts:42-60` |
| ズームボタン(＋/－/リセット) | クリック | ＋/－はコンテナ中央基点で±1レベル。リセットは初期コンパクト変換へアニメーション復帰 | `use-zoom-controls.ts`, `components/ZoomControls.tsx` |

初期倍率は「コンテナに余白15%を残して収める倍率×0.85」を、下限0.25・上限0.65にクランプして決める
(`utils/layout/geometry.ts:17-29` `computeCompact`)。最小倍率はその70%(`computeCompact結果×0.4`、下限0.25)
(`utils/layout/geometry.ts:31-35` `computeMinScale`)。最大倍率は`MAX_SCALE=5`固定(`utils/layout/geometry.ts:8`)。

モーダル(`[role="dialog"][aria-modal="true"]`)が開いている間はポインタ・ホイール・キーボードの
いずれもキャンバス操作を無視する(`utils/canvas-metrics.ts:6-7` `isModalOpen`、
`use-canvas-pointer.ts:44`, `use-viewport-input.ts:45,67`)。

`prefers-reduced-motion: reduce` 環境では、ズームボタンのリセットやコーチマークの中央寄せなど
`animateTo` 経由のアニメーションは transition なしで即時反映される(`use-viewport.ts:120,128-134`,
`utils/canvas-metrics.ts:11-12`)。

## 3. チーム箱(バウンダリ)のクリック・長押し・タップ判定

チーム箱のインタラクション面は `data-team-id`(値は `Team.idPrefix`、`Team.id` ではない)を持つ
1枚の `div`(`components/TeamArea.tsx:83-86`)。

- **タップ/クリックで開く**: `onClick` ハンドラが `onBoundaryOpen(team.id, rect)` を呼び、押した
  要素の実測 `DOMRect` を渡す(`components/TeamArea.tsx:53-62`)。開いた先はチームオーバーレイモーダル
  ——詳細は `docs/team-overlay/` を参照(本書はここでハンドオフする)
- **長押し(300ms)**: `pointerdown` から300ms 経過で `longPressedRef` を立てる
  (`components/TeamArea.tsx:8,96-102`)。長押し発火後に来る `click` は1回だけ無視され、
  オーバーレイは開かない(`components/TeamArea.tsx:57-60`)。**長押し自体が何かを開始する処理は
  無い** — 現状のコードは「長押し後のクリックを無視する」ためだけにこのタイマーを使っている
  (誤クリック抑制。長押しに割り当てられた別機能は無い)
- **編集モード中**: `isEditMode` の間は `handleClick` が早期リターンし、バウンダリを開かない
  (`components/TeamArea.tsx:56`)。代わりにラベル板の `onPointerDown`/`onClick` がチーム名編集・
  チームアクションシートへ配線される(`components/TeamArea.tsx:130-132`)
- **キャンバスのパンとの排他**: キャンバス側は1本指ドラッグが8px を超えた時点で
  `setPointerCapture` を取り、以降の `pointerup` はチーム箱に届かない。パンと判定された直後の
  合成 `click` は `onClickCapture` で1フレームだけ抑制される(`use-canvas-pointer.ts:86-87,126-131,157-162`)。
  これにより「パンのつもりが誤ってチーム箱を開いてしまう」ことを防ぐ

チーム箱の「N名」表示は `seat.teamId` が一致し `employeeId` が非 null の座席数(在籍数ではなく
配属数)であり、在席状態(在席/外出等)は反映しない(`components/SeatMapCanvas/hooks/use-canvas-view-model.ts:45-57`)。

チーム箱同士は重ならない前提で、`mocks/teams.json` の `area` が直接その根拠(3章参照)。

## 4. 会議室・備品(家具)の扱い

`Facility.kind` は `meeting | booth | common | aisle`、`Furniture.kind` は壁・柱・階段・ドア・窓・
ソファ・テーブル・棚・植物・ベッドの10種(`types/index.ts:219,231-241`)。両者は別型で、
`Facility` が会議室ロジック(状態色・ホバーカード・詳細パネル)を持つ一方、`Furniture` は形と
名前だけを持つ(`components/FurnitureBlock.tsx:4-5`)。

| 種別 | クリック | ホバー | DOM フック |
|---|---|---|---|
| 会議室(`meeting`) | 詳細パネルを開く(閲覧モードのみ。編集モードは選択のみ) | PC(`pointerType==='mouse'`)のみホバーカードを表示 | `data-furniture-id` + `data-facility="true"` |
| ブース/共用部(`booth`/`common`) | 詳細パネルを開く | なし | `data-furniture-id`(`data-facility`は付かない) |
| 通路(`aisle`) | 無し(会議室コードパスから完全除外) | 無し | `data-furniture-id`(`data-facility`は付かない) |
| 家具(`Furniture`) | 無し(`pointerEvents: 'none'`) | 無し | `data-furniture-id`(`data-facility`は付かない) |

(`components/FacilityBlock.tsx:16-30,39-48`, `components/FurnitureBlock.tsx:5,19,25`)

会議室の状態(空室/会議中/まもなく/施設未連携)は `facilityId`(予定システム側ID)の有無と
`mocks/facility-meetings.json` の現在時刻突合から導出する。`facilityId` が無ければ常に
「施設未連携」(`utils/facility-status.ts:29,34,41`)。応接室(`fac-05`)は `facilityId` を持たない
モックデータの実例(`mocks/facilities.json:46-55`)。

会議室ホバーカードは対象の少し外側(下端から12px、下に240px以上余白が無ければ上向きに反転)に
出る(`components/FacilityHoverCard.tsx:8-12,42-45`)。マウス以外のポインタでは呼ばれない
(`components/FacilityBlock.tsx:46`)。

家具はキャンバス上ではポインタを受けない(`pointerEvents: 'none'`、`components/FurnitureBlock.tsx:25`)。
選択・ドラッグは編集モード中のみ `EditObjectLayer` が上に重ねる別の操作面で担い、閲覧用の
`FacilityBlock`/`FurnitureBlock` 自体には編集分岐を持ち込まない
(`components/SeatMapCanvas/components/EditObjectLayer.tsx:6-9`)。

家具の種データは現時点で空(`mocks/furniture.json`)。編集モードで置いた分だけが保存レイアウト
(`localStorage`)側に載る(`lib/mock-loader.ts:50`)。

## 5. 座席がキャンバスに描かれない理由(sr-only ミラー)

閲覧モードのキャンバスには個人座席カード(アバター・氏名・在席状態)を一切描かない。これは
`CLAUDE.md` 不変ルール1・2そのものであり、キャンバスの構成要素は「通路線+チーム箱+家具/会議室」
に限られる。

座席へのアクセス経路は `SeatMirrorLayer`(`components/SeatMirrorLayer.tsx`)が `.sr-only` の中に
座席ぶんの `<button>` を並べて提供する。理由はコメントに明記されている:
「原本のキャンバスは個人座席カードを描かない。座席は sr-only ミラー層にのみ存在し、
キーボード/スクリーンリーダー経路(roving tabindex)で全座席へ到達できるようにする」
(`components/SeatMirrorLayer.tsx:4-5`)。

- 矢印キー(←→/↑↓)でミラー内の座席ボタン間を移動する roving tabindex
  (`components/SeatMirrorLayer.tsx:19-34`、フォーカス中のボタンだけ `tabIndex=0`)
- ラベルは「氏名、チーム名」または「空席」(`components/SeatMirrorLayer.tsx:39-40`)
- クリック/Enter で座席選択コールバック(閲覧モードでは詳細パネルを開く導線)を呼ぶ

視覚的な「座席への到達」は、チーム箱を開いた先のオーバーレイ内で個人カードとして行う
(`docs/team-overlay/` の管轄)。キャンバス単体では個人の視覚的表現を一切持たない。

## 6. 編集モードとの境界(参考)

編集モードは `SeatMapCanvas` の同じツリー内に同居するが、本書は閲覧モードの画面仕様を対象と
する。編集モード固有の挙動(座席・チーム・会議室/家具のドラッグ移動、スナップ吸着、undo、
配置フロー)は本書の範囲外。以下だけ、閲覧モードとの境界として押さえる。

- 編集モード中は `isEditMode=true` が伝播し、4章の会議室クリックは詳細パネルを開かず選択のみ、
  チーム箱クリックはバウンダリを開かない(3章参照)
- 編集モード中も 1章の座席カードは描画されない。座席選択は sr-only ミラーレイヤー
  (`SeatMirrorLayer`)のボタンが唯一の入口で、Shift+クリックでトグル選択、Ctrl/Cmd+A で
  直前に選択した座席の所属チーム全席を選択する(5章参照)
- `data-canvas-transform-layer` / `data-team-id` / `data-furniture-id` / `data-facility` の
  DOM フックは編集モードでも同じ値・同じ位置で存在する(検証スクリプトが編集モードでも走る根拠。
  `docs/seat-map/testing.md` 参照)

## 未検証・要確認

- 長押し(300ms)がクリック抑制以外の意味を持つかどうかは、コード上は確認できなかった
  (3章参照。仕様書 `~/seatmap-demo-spec/` 側に別の意図があるかは未確認)
