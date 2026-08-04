# authoring.md — React/Next 実装規則(seatmap-demo 固有)

技術非依存の原則(配置判断フローチャート·`lib`/`utils`の境目·分割基準の考え方など)は
`~/.claude/rules/01-authoring.md` を参照。本書はこのスタック(Next.js Pages Router + React)固有の
具体的な実装規則だけを持つ。**新しいファイルを作る前に必ず読む。**

各項目末尾の `[rule-id]` は対応する自動検査規則(`.claude/code-rules.json` で on/off)。

## 1. フォルダ構成

実際の配置(2026-08-01 時点)。

```
seatmap-demo/
├─ pages/                       Next.js ルート定義専用。Head + プロバイダのみ
│  ├─ _app.tsx
│  ├─ _document.tsx
│  └─ index.tsx                 画面本体は持たない。components/SeatMapView へ委譲
├─ components/
│  ├─ SeatMapView/               画面ルート
│  │  ├─ index.tsx               組み立てのみ
│  │  ├─ type.ts
│  │  ├─ components/             AppHeader.tsx / EditDialogs.tsx / EditModeLayer.tsx
│  │  └─ hooks/                  use-edit-dialogs.ts / use-layout-save.ts / use-seat-map-data.ts
│  ├─ SeatMapCanvas/              ← 分割の模範例。index.tsx が最薄
│  │  ├─ index.tsx               組み立てのみ。ロジックは全て hooks へ委譲
│  │  ├─ type.ts
│  │  ├─ components/             EditSeatLayer.tsx / JumpMarker.tsx / TeamAreaLayer.tsx
│  │  ├─ hooks/                  use-canvas-pointer.ts / use-viewport.ts / use-edit-drag.ts 等9本
│  │  └─ utils/                  anim-step.ts / canvas-metrics.ts / gesture-math.ts / sibling-rects.ts
│  ├─ TeamOverlay/ EmployeeDirectory/ EmployeeDetail/ AvatarCustomizer/ SwipeDateStage/
│  │                             同型構造(index.tsx + type.ts + components/ + hooks/ + utils/)
│  ├─ edit/                      編集モード専用の単発コンポーネント群。フォルダ化はしていない
│  └─ *.tsx                      単一責務のまま短い共通部品(SeatCard.tsx / ZoomControls.tsx 等)
├─ contexts/                     Context + Provider(detail-panel-context.tsx 等)
├─ hooks/                        2箇所以上から使われ昇格したフック(use-edit-session.ts 等10本)
├─ lib/                          アプリ外部との接続
│                                (fetch-mock.ts / mock-loader.ts / layout-persistence.ts / avatar-persistence.ts)
├─ utils/                        純関数(geometry.ts / presence.ts / kana.ts 等)
├─ types/                        型定義(index.ts)
├─ mocks/                        座標を含む全モック JSON。座標のコードへのハードコード禁止の根拠
├─ styles/                       CSS。globals.css が @import で列挙(並び順=カスケード順)
│                                tokens.css だけが色の定義場所。書き分けは 6.5 → 手動ベンダープレフィックス禁止は pitfalls.md
├─ scripts/                      verify-s1.js(実行中の画面で検証) / generate-mocks.mjs
├─ docs/                         authoring.md(本書) / pitfalls.md
└─ .claude/                      code-rules.json(自動検査設定)
```

## 2. `lib` / `utils` の境目 — このリポジトリの実例

判定基準そのものは `~/.claude/rules/01-authoring.md` を参照(「アプリの外に出るか」)。以下は本リポジトリでの適用結果。

| 置き場 | ファイル | 理由 |
|--------|----------|------|
| `lib/` | `fetch-mock.ts` | 擬似APIレイヤー(遅延付きの取得) |
| `lib/` | `mock-loader.ts` | SWR によるデータ取得層(下記 3. の例外フックもここに同居) |
| `lib/` | `layout-persistence.ts` | localStorage への読み書き |
| `lib/` | `avatar-persistence.ts` | localStorage への読み書き |
| `utils/` | `geometry.ts` | 座標変換の計算だけ |
| `utils/` | `presence.ts` | 予定配列 → 在席状態の導出だけ |
| `utils/` | `kana.ts` | 検索用の文字列正規化だけ |

> `lib/` に純関数を置かない。`utils/` に fetch や localStorage を書かない。

## 3. フック規則

- 関数名は `use` 接頭辞必須
- ファイル名は kebab-case + `use-` 接頭辞(`use-canvas-pointer.ts` のように)。
  **リポジトリ全体のフックファイル40本を確認済み。全て kebab-case + `use-` 接頭辞であり、この形式を維持する** `[hook-file-naming]`
- Props / 戻り値の型はファイル上部に定義する
- コンポーネント専用フックは `components/<Name>/hooks/` へ。2箇所以上で使われたら
  ルート直下の `hooks/` へ昇格する
- 1本のフックを複数責務で分割する時は下記 5.3。**フォルダ化しても `index.ts` は作らない**
- **例外**: `lib/mock-loader.ts` はデータ取得フック(`useEmployees` 等)を取得層と一体で同居させる。
  取得層が1ファイルに閉じているため `hooks/` へ分離しない(`~/.claude/rules/01-authoring.md` の
  「フックは常に `hooks/`」原則に対する明示的な例外)

## 4. コンポーネント規則

- `index.tsx` は組み立てのみ。ロジックはフックへ委譲する(`SeatMapCanvas/index.tsx` が模範)
- 200行超 **かつ** 複数責務なら `components/<Name>/` へ分割。単一責務のまま長いだけなら分割しない
- 分割時の構造と `index.tsx` の薄さの基準は下記 5.2
- ローカルに `lib/` は作らない。外部接続は必ずルートの `lib/` に集約する

## 5. SRP 分割パターン

分割の判断基準(行数ではなく責務の数)は `~/.claude/rules/01-authoring.md` 3.、
入口の作り方の原則とその理由は同 4.。**本節はこのリポジトリでの実例と適用結果だけを持つ。**

### 5.1 共通手順

1. **責務に名前を付ける。** 名前が付かない塊は責務ではないので分割しない
2. **切り出し先は種類で自動的に決まる。** 迷う余地を残さない
   | 切り出すもの | 行き先 |
   |--------------|--------|
   | JSX を返す | `components/` |
   | `use` で始まり React 機能を呼ぶ | `hooks/` |
   | 副作用のない計算・定数 | `utils/` |
   | 型だけ | `type.ts`(サブフォルダを作らず平坦に置く) |
3. **元のファイルに残るのは配線だけ。** 状態・計算・分岐が残っているなら切り出しが足りない
4. **2箇所以上から使われ始めたらルート直下へ昇格。** ローカルに複製しない

### 5.2 コンポーネント — `<Name>/index.tsx` パターン

コンポーネントのフォルダは **公開物がちょうど1つ**(そのコンポーネント)なので、入口を `index.tsx` にする。
呼び出し側は `@/components/AvatarCustomizer` とだけ書き、内部構造を知らなくてよい。

模範例 `components/AvatarCustomizer/`:

```
components/AvatarCustomizer/
├─ index.tsx                     組み立てのみ(9行)
├─ type.ts                       この木で共有する型
├─ components/
│  ├─ AvatarCustomizerModal.tsx  モーダル本体
│  ├─ AvatarPreview.tsx
│  ├─ PartsPanel.tsx
│  ├─ PartChipRow.tsx
│  ├─ SwatchRow.tsx
│  └─ AiStudio.tsx
├─ hooks/
│  ├─ use-avatar-draft.ts        編集中の下書き状態と差し替え口
│  ├─ use-ai-generator.ts        AI生成モック(通信なし)
│  └─ use-dialog-shell.ts        フォーカス・Escape 閉じ・背景スクロール遮断
└─ utils/
   ├─ avatar-options.ts          パーツ候補・色パレットの定数
   ├─ clone-avatar.ts            不変クローン
   └─ ai-candidates.ts           生成モックの固定候補12件
```

`index.tsx` の全文。ここまで薄くできれば分割は成功している。

```tsx
import { AvatarCustomizerModal } from './components/AvatarCustomizerModal'
import { useSelfAvatar } from '@/contexts/self-avatar-context'

// 開いている時だけモーダルをマウント(hooks の on/off を開閉に一致)
export const AvatarCustomizer = () => {
  const { isEditorOpen, selfAvatar, save, closeEditor } = useSelfAvatar()
  if (!isEditorOpen || !selfAvatar) return null
  return <AvatarCustomizerModal initial={selfAvatar} onSave={save} onClose={closeEditor} />
}
```

`index.tsx` に置いてよいもの / いけないもの:

| | 内容 |
|---|---|
| ○ | Props の受け取り、Context の読み出し、早期 return、下位部品への受け渡し |
| × | `useState` / `useEffect` の直書き、計算式、条件分岐の塊、インラインのイベントハンドラ本体 |

`index.tsx` が100行を超えたら、それは組み立て以外が残っている合図。分割先を再検討する。

### 5.3 フック — フォルダ化しても `index.ts` は作らない

フックが複数責務を抱えて分割する時、**コンポーネントと同じ形にはしない**。
`index.ts` を置かず、**フォルダ名と同じ名前のフックファイルを入口にする**。

× Bad — バレルを作る:

```
hooks/use-layout-editor/
├─ index.ts                      ← 作らない
├─ use-layout-draft.ts
└─ use-layout-history.ts
```

```ts
import { useLayoutEditor } from '@/hooks/use-layout-editor'
```

○ Good — 使うフックを名指しする:

```
hooks/use-layout-editor/
├─ use-layout-editor.ts          束ねる入口。下の2本を呼ぶだけ
├─ use-layout-draft.ts           編集中の下書き状態
└─ use-layout-history.ts         undo/redo スタック
```

```ts
import { useLayoutEditor } from '@/hooks/use-layout-editor/use-layout-editor'
import { useLayoutHistory } from '@/hooks/use-layout-editor/use-layout-history'
```

`index.ts` を禁じる理由(指すべき「その1つ」が無い / grep が切れる / 部分利用が潰れる)は
`~/.claude/rules/01-authoring.md` 4. を参照。ここでは結論だけ持つ。

命名は `[hook-file-naming]` の対象のまま。**フォルダ名・フォルダ内の全ファイルとも kebab-case +
`use-` 接頭辞**にする(`hooks/layout-editor/` のように接頭辞を落とさない)。

> 現時点でフォルダ化されたフックは無い。ルート `hooks/` の10本・コンポーネント専用の30本、
> 計40本すべて単一責務のまま1ファイルで収まっている。最初にフォルダ化した時はここに実例を追記する。

## 6. import alias

- 兄弟 `./` / 同じツリー内 `../` / ツリーを跨ぐ `@/`
- ツリーを跨ぐ時は `@/hooks/...` `@/utils/...` のように置き場が分かる形で書く

## 6.5 CSS の書き分け

このリポジトリには**2つのスタイル系統が同居している**。新規に書く時はまずどちらかを選ぶ。

| 系統 | 使っている場所 | 新規で選ぶ条件 |
|------|---------------|---------------|
| Tailwind ユーティリティ | `EmployeeDirectory/**` `AvatarCustomizer/**` `AppHeader` `a11y/**` | **既に Tailwind で書かれたツリーの中**に部品を足す時 |
| `styles/*.css` のグローバルクラス | それ以外の全て(キャンバス・詳細パネル・編集モード等) | 上記以外。迷ったらこちら |

判定は「**その親コンポーネントがどちらで書かれているか**」の一点で決める。同じツリー内で
混ぜると、片方を直しても効かない箇所が生まれて原因追跡が難しくなる。

### グローバルクラスの置き場と命名

- 置き場は**画面・機能ごとに1ファイル**。`styles/globals.css` の `@import` に追記する
  (CSS バレル禁止・Turbopack 対策のため直接列挙する)
- **`@import` の並び順はカスケード順そのもの**。同じ詳細度の規則は後勝ちなので、並びを変えると
  見た目が静かに変わる。並べ替えたら必ずビルド成果物のCSSを分割前と突き合わせる
- クラス名は**機能ごとの短い接頭辞**で名前空間を切る(`fac-` 施設詳細 / `schedule-` 予定欄 /
  `sheet-` シェル / `emp-dir-` サイドバー)。接頭辞なしの汎用名は衝突するので作らない
- 状態は `.is-` 接頭辞の修飾クラス(`.fac-row.is-now`)。既存規則と競合する時は
  **同じか高い詳細度**にする(`.zoom-controls button.zoom-controls-reset` が実例)

### 色は必ずトークン経由

`styles/**` に色リテラル(`#rrggbb` / `rgba()`)を書かない。**`styles/tokens.css` が唯一の定義場所**。

理由: リテラルで書くと `dracula` / `kuroxxx` テーマで浮く。実際 `.fac-hover` のアイコンが
`#2563eb` 固定だった等の不整合が過去に発生している。

- 半透明が要る時は `color-mix(in srgb, var(--color-surface) 97%, transparent)` の形にする
- テーマ非依存にしたい色(モーダルの暗幕など)も**トークンとして** `tokens.css` に置く
  (`--color-scrim`)。「テーマに依らないから直書き」は認めない
- 色を薄める/濃める計算の相手側もトークンにする(`--color-band-highlight`)

**例外**: `lib/avatar/**` `utils/team-colors.ts` のようにアバターパレット・チーム色を
**データとして**持つ TS ファイルは対象外。これは配色定義ではなくコンテンツである。

### 使われなくなったクラスは消す

参照が無くなったクラスは残さない。ただし削除前に**動的組み立てを必ず確認する**。

```
`sheet-${variant}`  → .sheet-employee / .sheet-facility / .sheet-schedule
`cat-${category}`   → .cat-meeting / .cat-out / .cat-vacation
```

この形は `grep .sheet-employee` では引っかからない。接頭辞(`sheet-`)で検索すること。

## 7. コードスタイル

| ルール | 内容 | 自動検査 |
|--------|------|----------|
| any禁止 | `any` を使わない | `[ts-no-any]` |
| unknown制限 | `unknown` はサードパーティAPI・catch・型ガード引数のみ | `[ts-no-any]` |
| セミコロンなし | 文末に `;` を書かない | `[ts-no-semicolon]` |
| シングルクォート | 文字列は `'` を使う(JSON・ライブラリ要件のみ `"` 許容) | `[ts-single-quote]` |
| フックファイル命名 | kebab-case + `use-` 接頭辞 | `[hook-file-naming]` |
| コメント言語 | 日本語のみ・最小限 | `[comment-language]` |
| ベンダープレフィックス手書き禁止 | `-webkit-` 等を手で書かない(自動付与される。詳細は `docs/pitfalls.md`) | `[css-manual-vendor-prefix]` |

各 `[rule-id]` の on/off は `.claude/code-rules.json` を参照。
