# authoring.md — コードの書き方・割り方の規則(seatmap-demo 固有)

技術非依存の分割基準の考え方・入口の作り方の原則は `~/.claude/rules/01-authoring.md` を参照。
本書はこのスタック(Next.js Pages Router + React)でのフック/コンポーネントの実装規則・分割パターン・
コードスタイルだけを持つ。**フックやコンポーネントを実装・分割する時に読む。**
置き場所の判断は `docs/structure.md`、CSS・色の書き分けは `docs/styling.md` を参照。

各項目末尾の `[rule-id]` は対応する自動検査規則(`.claude/code-rules.json` で on/off)。

## 1. フック規則

- 関数名は `use` 接頭辞必須
- ファイル名は kebab-case + `use-` 接頭辞(`use-canvas-pointer.ts` のように)。
  **リポジトリ全体のフックファイル40本を確認済み。全て kebab-case + `use-` 接頭辞であり、この形式を維持する** `[hook-file-naming]`
- Props / 戻り値の型はファイル上部に定義する
- コンポーネント専用フックは `components/<Name>/hooks/` へ。2箇所以上で使われたら
  ルート直下の `hooks/` へ昇格する
- 1本のフックを複数責務で分割する時は下記 3.3。**フォルダ化しても `index.ts` は作らない**
- データ取得フック(`useEmployees` 等)は `hooks/use-mock-data.ts` に置く。取得層(`lib/mock-loader.ts`)
  とは分離しており、例外なく「フックは常に `hooks/`」原則に従う

## 2. コンポーネント規則

- `index.tsx` は組み立てのみ。ロジックはフックへ委譲する(`SeatMapCanvas/index.tsx` が模範)
- 200行超 **かつ** 複数責務なら `components/<Name>/` へ分割。単一責務のまま長いだけなら分割しない
- 分割時の構造と `index.tsx` の薄さの基準は下記 3.2
- ローカルに `lib/` は作らない。外部接続は必ずルートの `lib/` に集約する

## 3. SRP 分割パターン

分割の判断基準(行数ではなく責務の数)は `~/.claude/rules/01-authoring.md` 3.、
入口の作り方の原則とその理由は同 4.。**本節はこのリポジトリでの実例と適用結果だけを持つ。**

### 3.1 共通手順

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

### 3.2 コンポーネント — `<Name>/index.tsx` パターン

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

### 3.3 フック — フォルダ化しても `index.ts` は作らない

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

## 4. コードスタイル

| ルール | 内容 | 自動検査 |
|--------|------|----------|
| any禁止 | `any` を使わない | `[ts-no-any]` |
| unknown制限 | `unknown` はサードパーティAPI・catch・型ガード引数のみ | `[ts-no-any]` |
| セミコロンなし | 文末に `;` を書かない | `[ts-no-semicolon]` |
| シングルクォート | 文字列は `'` を使う(JSON・ライブラリ要件のみ `"` 許容) | `[ts-single-quote]` |
| フックファイル命名 | kebab-case + `use-` 接頭辞 | `[hook-file-naming]` |
| コメント言語 | 日本語のみ・最小限 | `[comment-language]` |
| ベンダープレフィックス手書き禁止 | `-webkit-` 等を手で書かない(自動付与される。詳細は `docs/pitfalls.md`) | `[css-manual-vendor-prefix]` |
| 色リテラル禁止 | `styles/**` に `#rrggbb`・`rgb()` を書かない。色は `tokens.css` のみ(`docs/styling.md` 参照) | `[css-color-literal]` |

各 `[rule-id]` の on/off は `.claude/code-rules.json` を参照。
