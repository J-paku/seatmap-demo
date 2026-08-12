# architecture.md — 座席マップキャンバスの構成・データフロー・DOM フック

範囲は `components/SeatMapView/` と `components/SeatMapCanvas/`。チームオーバーレイモーダルの
内部構造(`components/TeamOverlay/`)は対象外——`docs/team-overlay/` を参照。

## 1. コンポーネント/フックの木

```
components/SeatMapView/index.tsx          画面ルート。組み立てのみ
├─ hooks/use-seat-map-data.ts             SWR合成データ→表示用に整形(2章)
├─ hooks/use-team-seat-focus.ts           座席1件→所属チームのオーバーレイを開く唯一の入口
├─ hooks/use-minimap-payload.ts           オーバーレイ内ミニマップ用データの組み立て
├─ hooks/use-object-placement.ts          会議室/家具/チームの新規配置(編集モード)
├─ hooks/use-seat-assign.ts               座席への社員配属(編集モード)
├─ hooks/use-edit-dialogs.ts              編集モードの各種ダイアログ状態
├─ hooks/use-layout-save.ts               編集レイアウトの保存/破棄
└─ components/SeatMapCanvas/index.tsx     キャンバス本体。組み立てのみ
   ├─ hooks/use-viewport.ts               パン・ズームの変換モデル本体(3章)
   │  ├─ hooks/use-viewport-input.ts      リサイズ・キーボード・ホイール入力の配線
   │  └─ hooks/use-pinch-zoom.ts          2本指ピンチの状態機械
   ├─ hooks/use-canvas-pointer.ts         1本指パン・タップ・ダブルタップ・慣性
   ├─ hooks/use-zoom-controls.ts          ズームボタン(＋/－/リセット)のコマンド
   ├─ hooks/use-canvas-view-model.ts      LOD・カウンタ倍率・アクションバー座標等の派生値
   ├─ hooks/use-edit-drag.ts              編集モードのドラッグ(座席/チーム/オブジェクト共通)
   ├─ hooks/use-undo-chip.ts              「元に戻す」チップの表示位置と自動消去
   ├─ components/TeamAreaLayer.tsx        → @/components/TeamArea (data-team-id)
   ├─ components/EditObjectLayer.tsx      編集モードのみ。会議室/家具の操作面
   └─ utils/                              anim-step.ts / canvas-metrics.ts / gesture-math.ts / sibling-rects.ts
```

`SeatMapCanvas/index.tsx` が実際に描画する子(キャンバス外の画面固定 UI 含む)は
`@/components/FacilityBlock` `@/components/FurnitureBlock` `@/components/SeatMirrorLayer`
`@/components/ZoomControls` `@/components/MySeatButton`(`SeatMapView` 側でマウント)。

各フックの詳細な責務分割は `docs/authoring.md` 1章の構成図、分割基準は `~/.claude/rules/01-authoring.md`
3〜4章を参照。本書はこの木が「どう繋がっているか」だけを持つ。

## 2. データフロー

```
mocks/*.json (teams / seats / facilities / furniture / employees / schedules / facility-meetings)
  → lib/mock-loader.ts   (JSON→確定型への整形。キャッシュ入出力+疑似遅延(SWR フック本体は hooks/use-mock-data.ts)。この1ファイルが唯一の import 点)
    → useSeatLayout()    (teams+seats+facilities+furniture を SeatLayout に合成。localStorage 保存分があれば上書き)
      → SeatMapView/hooks/use-seat-map-data.ts
        effectiveLayout  = 編集モード中は editor.editingLayout、それ以外は layout
        employeeById     = Map<Employee['id'], Employee>
        facilityStateById = Map<Facility['id'], FacilityState>  (utils/facility-status.ts)
        effectivePresenceMap = Map<Employee['id'], PresenceStatus>  (編集モード中は凍結)
      → components/SeatMapCanvas  props (layout / employeeById / presenceMap / facilityStateById)
```

- 座標は全て `mocks/teams.json`(`area`)・`mocks/facilities.json`・`mocks/furniture.json`(空)・
  `mocks/seats.json` から来る。コード側は一切座標値を持たない(`CLAUDE.md` 不変ルール3)
- `SeatLayout.viewBox` は `utils/layout/geometry.ts` の `VIEWBOX_W=1600` / `VIEWBOX_H=1154` から
  `lib/mock-loader.ts:98` が組み立てる。座標系の基準値はここ1箇所にしかない
- 保存済みレイアウト(`localStorage['seatmap-demo/layout']`)は `lib/layout-persistence.ts` が
  唯一の読み書き口。読み込み時に `furniture` フィールドの既定値埋め(`?? []`)もここで行う
  ——散らすと「旧保存分を持つ利用者だけクラッシュする」再現困難なバグになるためとコメントに明記
  (`lib/layout-persistence.ts:10-13,20`)。`docs/pitfalls.md` 2番と対の話

## 3. 座標系とパン・ズームのパイプライン

論理座標(`mocks/*.json` の `x`/`y`、`viewBox` は 1600×1154)と画面座標(`clientX`/`clientY`)の
変換は `utils/layout/geometry.ts` に集約される。

| 関数 | 役割 |
|---|---|
| `toLogical(screen, scale, translate)` | 画面座標→論理座標 |
| `zoomAtPoint(t, newScale, ax, ay)` | 画面座標 `(ax, ay)` を固定したまま倍率を変える translate を算出 |
| `computeCompact(w, h)` | 初期表示の `Transform`(余白15%・上限0.65) |
| `computeMinScale(w, h)` | 最小倍率(`computeCompact` の70%、下限0.25) |
| `scaleToLevel` / `levelToScale` | `scale ↔ log2` 相互変換。ズーム操作は「±1レベル=×2/÷2」で統一表現する |

`useViewport`(`components/SeatMapCanvas/hooks/use-viewport.ts`)がこの変換の**唯一の保持者**。
`transformRef` に現在値を持ち、`applyTransform` が DOM の `style.transform` へ直接書き込む
(`translate3d(...) scale(...)`)。React の再レンダーは `transformSnap`(state)の更新だけに絞り、
それも「ジェスチャー終了時の1回」に限定する(`use-viewport.ts:18-19,35-37`)。理由: 毎フレーム
`setState` するとパン中も再レンダーが走り重くなるため。

rAF ループ(`startLoop`)は慣性(`inertia`)・レベルズームの追従(`lerp`)・オーバースクロール
復帰(`bounce`)の3種を1フレームずつ `utils/anim-step.ts:stepAnim` に計算させ、`useViewport` 側は
DOM 適用と次状態の保持だけを行う(関数は純粋・DOM に触れない、`anim-step.ts:5`)。

`useCanvasPointer`(1本指)と `usePinchZoom`(2本指)はどちらもこの `Viewport` の関数
(`applyTransform` / `lerpZoom` / `immediateZoom` / `animRef` 等)だけを叩き、変換の実装を知らない。
`useViewportInput` はキーボード・ホイール・リサイズという「入力のきっかけ」だけを配線する
(`use-viewport-input.ts:6-7` のコメント「変換そのものは useViewport が持ち、ここは『いつ呼ぶか』
だけを担う」)。

## 4. LOD(詳細度)とカウンタ倍率

`lodOf(scale)`(`components/SeatMapCanvas/utils/canvas-metrics.ts:9`)が `scale>=0.5` を `detail`、
`>=0.3` を `mid`、それ未満を `overview` に区分する。`Lod` 型は `types/index.ts:200` で1箇所に統一
されており、以前は `SeatCard`・`TeamArea`・`SeatMapCanvas/type` の3箇所に同じ union が別々に
書かれていたとコメントにある(型定義の重複を統合した経緯、`types/index.ts:198-199`)。

`counterScale`(文字サイズ補正)は `clamp(0.8 / scaleSnap, 1, 2)`
(`components/SeatMapCanvas/hooks/use-canvas-view-model.ts:83`)。倍率が下がるほど文字を相対的に
拡大し、縮小時の可読性を保つ。

## 5. DOM フックの契約

`CLAUDE.md` 不変ルール4で固定されている4つ。検証スクリプト(`scripts/verify-s1.js`、
`docs/seat-map/testing.md` 参照)がこれらのセレクタに直接依存するため、値の意味・付与位置を
変更する際は検証スクリプト側の前提も崩れる。

| フック | 値 | 付与箇所 | 契約 |
|---|---|---|---|
| `data-canvas-transform-layer="true"` | 固定文字列 | 変換レイヤーの `div` 1枚(`components/SeatMapCanvas/index.tsx:128`) | パン・ズームで一括変換される唯一のレイヤー。`getComputedStyle(...).transform` から現在の `scale` を読める(`verify-s1.js:53`) |
| `data-team-id` | `Team.idPrefix`(**`Team.id` ではない**) | チーム箱のインタラクション面(`components/TeamArea.tsx:84`) | クリックを直接受ける矩形。`SeatMapCanvasHandle.measureTeamRect` もこの属性で `querySelector` する(`components/SeatMapCanvas/index.tsx:82`) |
| `data-furniture-id` | `Facility.id` または `Furniture.id` | 会議室・ブース・共用部・通路・家具すべて(`components/FacilityBlock.tsx:24,41`, `components/FurnitureBlock.tsx:20`) | 種別を問わず「オブジェクトである」ことの共通マーカー |
| `data-facility="true"` | 固定文字列(`meeting` 種別のみ) | `components/FacilityBlock.tsx:42`(`isMeeting` の時だけ属性が付く。他は `undefined` = 属性自体が付かない) | 「会議室として数える」対象の絞り込み。家具側は明示的にこの属性を付けない理由がコメントにある: 「検証スクリプトが会議室だけを数えているため」(`components/FurnitureBlock.tsx:6`) |

`measureTeamRect` の引数が `Team.idPrefix` であって `Team.id` でない点は、呼び出し側
(`components/SeatMapView/hooks/use-team-seat-focus.ts:43`)・型定義のコメント
(`components/SeatMapCanvas/type.ts:44`)双方に明記されている、取り違えやすい実装ノート。

## 6. 会議室/家具の状態解決

`utils/facility-status.ts` の `deriveFacilityState(facility, meetings, nowMin)` が
`facilityId`(予定システム連携ID)の有無→今の会議→直近30分以内の次の会議、の順で
`available / in_meeting / upcoming / unlinked` を決める。呼び出しは
`SeatMapView/hooks/use-seat-map-data.ts:69-80` の `facilityStateById` 組み立てに1箇所だけ。
「今日」を表示中のときだけ現在時刻で導出し、他日は連携有無のみ判定する
(`use-seat-map-data.ts:76`)。

家具の建設設備/オブジェクト区分(名前を持つか・ピッカーでのグループ分け)は
`utils/furniture-catalog.ts` の `FURNITURE_CATEGORY` レコード1箇所が唯一の判定基準
——`FurnitureKind` を追加すると `Record` の網羅性チェックでコンパイルが落ちる設計
(`utils/furniture-catalog.ts:5-7` のコメント)。

当たり判定・吸着(スナップ)の対象矩形の取得は `utils/layout/layout-objects.ts` の `entriesOfKind` が
種別横断の唯一の入口。以前は同じ「何が対象か」の判断が5箇所(`layout-rules` に3・
`sibling-rects` に2)へ手書きで散っており、種別追加時に取りこぼしても型エラーにならなかった
——`switch` の `default` 節で `never` 型チェックにして塞いだ、とコメントに経緯がある
(`utils/layout/layout-objects.ts:3-9`)。

## 7. チームオーバーレイへのハンドオフ

キャンバスがチームオーバーレイへ渡す情報は `TeamOverlayPayload`
(`{ teamId, teamName, teamColor, rect }`)の1形。組み立ては
`utils/team-overlay-payload.ts:buildTeamOverlayPayload` の1箇所に統一されており、
バウンダリのクリック経路(`components/SeatMapCanvas/hooks/use-canvas-view-model.ts:96-102`)と
検索/自分の席経路(`components/SeatMapView/hooks/use-team-seat-focus.ts:34-57`)の両方がこれを通す
——チーム色の解決基準が2箇所に分岐しないようにするためとコメントにある
(`utils/team-overlay-payload.ts:1-3`)。

- **バウンダリクリック経路**: `TeamArea` の `onClick` → `TeamAreaLayer` → `useCanvasViewModel.handleTeamBoundaryOpen`
  → `SeatMapCanvasProps.onTeamBoundaryClick` → `SeatMapView` の `focus.openByBoundary`
  (ヒット表示なしでオーバーレイを開く)
- **検索/自分の席経路**: `SeatMapView` の `handleDirectorySeatSelect` / `handleGoToMySeat` →
  `useTeamSeatFocus.focusSeat(seat)` → `canvasRef.current.measureTeamRect(team.idPrefix)` で
  キャンバスを動かさず対象チーム箱の `DOMRect` を実測(画面外でも常に描画されているため測れる、
  `components/SeatMapCanvas/index.tsx:78-79` のコメント) → ヒット表示ありでオーバーレイを開く

この先(オーバーレイ自体の DOM 構造・HIT表示・ミニマップ)は `docs/team-overlay/` の管轄。

## 8. 編集モードとの同居(参考)

`isEditMode` は `SeatMapCanvasProps` 経由で伝播する任意 prop で、未指定(閲覧モード)では
編集系の分岐に一切到達しない(`components/SeatMapCanvas/type.ts:21` のコメント)。
編集モードのドラッグ状態機械(`use-edit-drag.ts`)・配置フロー(`SeatMapView/hooks/use-object-placement.ts`)・
保存(`use-layout-save.ts`)は本書の範囲外。DOM フック(5章)は編集モードでも同じ値・同じ意味を
保つ(`scripts/run-all-checks.mjs` が閲覧/編集セッション中/ゴースト配置中の3状態で
`verify-s1.js` を走らせている根拠。詳細は `docs/seat-map/testing.md` 3章)。

## 未検証・要確認

- 家具の当たり判定範囲(`utils/layout/layout-objects.ts` の `furniture` ケース)は編集モードのドラッグ・
  スナップでのみ使われ、閲覧モードでの参照箇所はコード上確認できなかった(FurnitureBlock は
  `pointerEvents:'none'` のため)
