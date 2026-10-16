# structure.md — 置き場所の判断規則(seatmap-demo 固有)

技術非依存の配置判断フローチャート・分割基準の考え方は `docs/conventions/01-authoring.md` を参照。
本書はこのスタック(Next.js Pages Router + React)での配置の規則と、代表的な実例だけを持つ。
**新しいファイルを作る前に必ず読む。** ファイルを全部は並べない(動かすたびに古くなるため)。全体は `git ls-files src` で見る。

## 1. フォルダ構成

ソースは `src/` の下、それ以外(モック・E2E・スクリプト・文書・設定)はルートに置く(`docs/decisions/0001-linux-disk-and-src.md`)。

```
seatmap-demo/
├─ src/
│  ├─ pages/        Next.js のルート定義だけ(_app.tsx・_document.tsx・index.tsx)。画面本体は持たない
│  ├─ components/   UI。画面ルートは SeatMapView/。フォルダにしたコンポーネントは index.tsx が入口、コンテナのフォルダだけ container.tsx が入口(5.)
│  ├─ contexts/     Context + Provider
│  ├─ hooks/        2か所以上が使うフック。use 関数とその型だけ(4.)
│  ├─ lib/          アプリの外との入出力(2.)
│  ├─ utils/        副作用を外へ残さない純粋関数・定数(2.)
│  ├─ types/        型定義だけ
│  └─ styles/       グローバル CSS 4本。tokens.css だけが色の定義場所(docs/styling.md)
├─ mocks/           座標を含む全モック JSON。座標をコードに書かない根拠(@mocks で読む。3.)
├─ tests/           Playwright の E2E(*.spec.ts)と共通の手順(*.helpers.ts)
├─ scripts/         画面へ注入する判定 verify-*.js・モック生成・門の対象選び・テストの境界と文書の検査
├─ public/          静的ファイル(favicon・ロゴ)
├─ docs/            文書。決定の記録は docs/decisions/、検証の手順は docs/agents/verification.md
└─ .claude/         code-rules.json(自動検査の設定)。worktrees の下は .gitignore 済み
```

`src/lib/`・`src/utils/`・コンポーネントの `utils` の `.ts` は、置いた時点でファイル別カバレッジ100%と変異テスト100%の対象になる
(規則の正本は `scripts/gate-targets.mjs`、理由は `docs/decisions/0004-extreme-constraints.md`)。

## 2. `lib` / `utils` の境目 — このリポジトリの実例

判定基準そのものは `docs/conventions/01-authoring.md` を参照(「アプリが閉じても残る側へ出るか」)。

`src/lib/` は外との入出力だけを置く。2026-10-12 時点の `src/lib/` の中身(テストを除く):

| ファイル | 外とのやり取り |
|---|---|
| `src/lib/fetch-mock.ts` | 擬似 API(静的 JSON を遅延付きで返す) |
| `src/lib/mock-loader.ts` | シードの読み込みと localStorage のキャッシュ。モックの JSON を `@mocks` で読む唯一の場所(テストを除く。SWR のフックは `src/hooks/use-mock-data.ts`) |
| `src/lib/garoon/` | Garoon の境界(施設のモック `facilities.ts`、組織・予定の境界の型 `org.ts`・`schedule.ts`)。実接続へ切り替えるときはここを差し替える |
| `src/lib/layout-persistence.ts`・`src/lib/read-stored-layouts.ts` | 編集したレイアウトの保存と読み出し(localStorage) |
| `src/lib/avatar-persistence.ts` | アバターの上書きの保存 |
| `src/lib/persist-theme.ts`・`src/lib/persist-tour-seen.ts`・`src/lib/store-minimap-collapse.ts` | テーマ・ガイドの既読・ミニマップの開閉の保存 |
| `src/lib/seat/` | お気に入り(社員・部署)の保存 |
| `src/lib/session-auth.ts` | ログインゲートの通過の印(sessionStorage) |
| `src/lib/write-clipboard.ts` | クリップボードへの書き込み |

`src/utils/` の代表例:

| ファイル | 理由 |
|---|---|
| `src/utils/layout/geometry.ts` | 座標変換の計算だけ |
| `src/utils/presence.ts` | 予定の配列 → 在席状態の導出だけ |
| `src/utils/employee-search.ts` | 検索用の文字列の正規化だけ |
| `src/utils/apply-background-inert.ts`・`src/utils/detect-reduced-motion.ts` | DOM・`matchMedia` に触れるが、ページを閉じれば消える一時的な作用なので utils |

> `src/lib/` に純関数を置かない。`utils` に fetch や localStorage を書かない。コンポーネントの中に `lib` は作らない。

## 3. import の別名

- 兄弟は `./`、同じツリーの中は `../`、ツリーを跨ぐときは `@/`(= `src/`)
- ツリーを跨ぐときは `@/hooks/...` `@/utils/...` のように置き場が分かる形で書く
- ルートの `mocks/` の JSON は `@mocks/...` で読む(今はテストを除くと `src/lib/mock-loader.ts` だけ)
- 別名は `tsconfig.json` の `paths` と `vitest.config.ts` の `alias` の両方に張る(片方だけだとテストか型検査が全滅する)

## 4. フックのファイルの規則

- `hooks` フォルダの下には `use-` で始まる kebab-case のファイルだけを置く。フォルダにしたフックは `index.ts` を作らず、
  フォルダと同じ名前のファイルを入口にする(実物: `src/hooks/use-layout-editor/use-layout-editor.ts`)
- **フックのファイルには `use` 関数とその型だけを置く。** フックでない関数・定数は、しきい値1つでも外へ出す
  (`docs/decisions/0005-hooks-hold-only-use.md`)

  | 出すもの | 行き先 |
  |---|---|
  | 1つのコンポーネントだけが使う関数・定数 | そのコンポーネントの `utils`(例: `src/components/TeamOverlay/utils/`) |
  | 複数のコンポーネントが使う関数・定数 | `src/utils/` |
  | localStorage・sessionStorage・クリップボードなどの読み書き | `src/lib/` |

- 2か所以上が使うようになったら `src/` 直下へ上げる(フックは `src/hooks/`、関数・定数は `src/utils/`・`src/lib/`)。写しを残さない
- `hooks` フォルダに単体テストを置かない。どのテストでも `renderHook` を使わない(`npm run test:boundary` が落とす)。
  フックの振る舞いは E2E と、そのフックを使うコンテナがあればその統合テスト(`container.browser.test.tsx`)が見る

## 5. コンポーネントのフォルダ

- 分ける基準(200行超かつ複数責務)と `index.tsx` の薄さの基準は `docs/authoring.md` 2.・3.
- フォルダにしたコンポーネントは `src/components/<Name>/` に `index.tsx`(組み立てだけ)・`type.ts`・`components`・`hooks`・`utils` を置く。
  代表例は `src/components/SeatMapCanvas/`・`src/components/TeamOverlay/`
- 例外はコンテナのフォルダ(一覧の正本は `scripts/container-dirs.mjs`。今は画面ルートの `src/components/SeatMapView/` だけ)。
  `index.tsx` を置かず `container.tsx` を入口にし、呼び出し側は `@/components/SeatMapView/container` のように `container` まで書く。
  隣に統合テスト `container.browser.test.tsx` を1本置く(`container.tsx` と統合テストの置き場の違反は `npm run test:boundary` が落とす。
  理由は `docs/decisions/0007-browser-integration-containers.md`)
- 1枚のシート・モーダルだけのものは `index.tsx` と専用の CSS Modules だけの軽い形(例: `src/components/TeamCategorySheet/`)
- `src/components/edit/` は編集モード専用の単発コンポーネント群で、フォルダにはしていない
- 単一責務で短い共通部品は `src/components/` 直下に1ファイルで置く(例: `src/components/ZoomControls.tsx`)
