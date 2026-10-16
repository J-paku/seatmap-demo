# decisions/ — 決定の記録(ADR)

**既存の設計を置き換えたくなった時、「なぜこの作りなのか」を問われた時だけ読む。**
過去の判断の記録であり、現在の姿の説明には使わない(それは `AGENTS.md` の表が指す各文書)。通常の機能追加では読まなくてよい。

| # | 決めたこと | 状態 |
|---|---|---|
| [0001](0001-linux-disk-and-src.md) | リポジトリを Linux 側のディスクへ移し、ソースを `src/` の下に集め、モックは `@mocks` で読む | Accepted |
| [0002](0002-prettier.md) | 書式を Prettier(J-paku.github.io と同じ設定)でそろえ、`format:check` を門に置く | Accepted |
| [0003](0003-playwright-e2e.md) | 受入検証の運転台を Playwright の E2E へ移す(「Playwright を入れない」方針を覆す) | Accepted |
| [0004](0004-extreme-constraints.md) | 人がコードを読まない代わりに制約を極端に置く(純粋モジュールのファイル別100%・変異100%・テストの境界) | Accepted(フックの振る舞いを E2E だけが見る部分と、統合テストの側でフックを測らない部分は Superseded by 0007) |
| [0005](0005-hooks-hold-only-use.md) | フックのファイルには `use` 関数とその型だけを置き、定数まで utils・lib へ出す | Accepted |
| [0006](0006-lighthouse-ci.md) | Lighthouse CI の測り方と下限 | Accepted |
| [0007](0007-browser-integration-containers.md) | 画面をコンテナ(`container.tsx`)にし、実ブラウザ(Vitest Browser Mode)で描く統合テストを E2E の手前に置く(段階の1つ目) | Accepted |

## 書くときの決まり

J-paku.github.io の `docs/decisions/` と同じ形にする。

- **リポジトリ内に根拠があるものだけを書く。** コードやコミットから「たぶんこういう理由だろう」と想像して書かない。
  理由の記録が無いときは「記録が無い」と書く
- 各 ADR は `Status` / `Context` / `Decision` / `Consequences` / `Alternatives Considered` を持つ
- 判断が覆ったら、元の ADR を消さずに `Status` を `Superseded by ####` に変え、新しい番号で書く
- 実測の数値には日付と測り方を添える。数値の正本は設定ファイル(`vitest.config.ts`・`stryker.config.mjs`・
  `lighthouserc.json` など)で、ADR は書いた時点の写しである

## 記録が無いもの

0001 より前の判断は ADR にしていない。座席を `.sr-only` ミラーへ分ける作りとキャッシュの指紋の理由は
`README.md` の「設計で迷った3点」に、守り続ける決まりは `CLAUDE.md` の不変ルールにある。
Pages Router・SWR・静的エクスポートを選んだ理由を書いた一次資料はリポジトリ内に無い。
