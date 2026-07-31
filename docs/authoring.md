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
├─ styles/                       CSS(Tailwind v4 / Lightning CSS。手動ベンダープレフィックス禁止 → pitfalls.md)
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
- **例外**: `lib/mock-loader.ts` はデータ取得フック(`useEmployees` 等)を取得層と一体で同居させる。
  取得層が1ファイルに閉じているため `hooks/` へ分離しない(`~/.claude/rules/01-authoring.md` の
  「フックは常に `hooks/`」原則に対する明示的な例外)

## 4. コンポーネント規則

- `index.tsx` は組み立てのみ。ロジックはフックへ委譲する(`SeatMapCanvas/index.tsx` が模範)
- 200行超 **かつ** 複数責務なら `components/<Name>/` へ分割。単一責務のまま長いだけなら分割しない
- 分割時の構造:
  ```
  components/<Name>/
    index.tsx     組み立てのみ
    type.ts       型は平坦にここへ
    components/   専用の下位部品
    hooks/        専用のフック
    utils/        専用の純関数・定数
  ```
- ローカルに `lib/` は作らない。外部接続は必ずルートの `lib/` に集約する

## 5. import alias

- 兄弟 `./` / 同じツリー内 `../` / ツリーを跨ぐ `@/`
- ツリーを跨ぐ時は `@/hooks/...` `@/utils/...` のように置き場が分かる形で書く

## 6. コードスタイル

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
