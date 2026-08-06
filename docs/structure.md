# structure.md — 置き場所の判断規則(seatmap-demo 固有)

技術非依存の配置判断フローチャート・分割基準の考え方は `~/.claude/rules/01-authoring.md` を参照。
本書はこのスタック(Next.js Pages Router + React)での実際の配置(実例)だけを持つ。
**新しいファイルを作る前に必ず読む。**

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
│                                tokens.css だけが色の定義場所。書き分けは docs/styling.md → 手動ベンダープレフィックス禁止は pitfalls.md
├─ scripts/                      verify-s1.js(実行中の画面で検証) / generate-mocks.mjs
├─ docs/                         structure.md(本書) / authoring.md / styling.md / pitfalls.md
└─ .claude/                      code-rules.json(自動検査設定)
```

## 2. `lib` / `utils` の境目 — このリポジトリの実例

判定基準そのものは `~/.claude/rules/01-authoring.md` を参照(「アプリの外に出るか」)。以下は本リポジトリでの適用結果。

| 置き場 | ファイル | 理由 |
|--------|----------|------|
| `lib/` | `fetch-mock.ts` | 擬似APIレイヤー(遅延付きの取得) |
| `lib/` | `mock-loader.ts` | SWR によるデータ取得層(`docs/authoring.md` 1. の例外フックもここに同居) |
| `lib/` | `layout-persistence.ts` | localStorage への読み書き |
| `lib/` | `avatar-persistence.ts` | localStorage への読み書き |
| `utils/` | `geometry.ts` | 座標変換の計算だけ |
| `utils/` | `presence.ts` | 予定配列 → 在席状態の導出だけ |
| `utils/` | `kana.ts` | 検索用の文字列正規化だけ |

> `lib/` に純関数を置かない。`utils/` に fetch や localStorage を書かない。

## 3. import alias

- 兄弟 `./` / 同じツリー内 `../` / ツリーを跨ぐ `@/`
- ツリーを跨ぐ時は `@/hooks/...` `@/utils/...` のように置き場が分かる形で書く
