# 0001. リポジトリを Linux 側のディスクへ移し、ソースを src/ の下に集め、モックは @mocks で読む

## Status

Accepted(2026-10-12、利用者の決定「位置とフォルダ構成まで J-paku.github.io と統一する」)

## Context

- リポジトリは WSL から見た `/mnt/c`(Windows のディスク)の上にあった。そこでは inotify が効かず
  (ファイル変更2回に対しイベント0件を実測、当時の `CLAUDE.md`)、dev サーバー(3000)は古いバンドルを配り続けた。
  そのため受入検証は静的配信(4173)に限り、`vitest.config.ts` も watch モードを使わない前提を注釈に書いていた
- ソースの8フォルダ(components・contexts・hooks・lib・pages・styles・types・utils)がリポジトリ直下にあり、
  `mocks/`・`scripts/`・`docs/`・設定ファイルと同じ階層に並んでいた
- J-paku.github.io は `~/workspace` の Linux 側のディスクにあり、ソースを `src/` の下に置いている

## Decision

1. リポジトリを `~/workspace/seatmap-demo`(Linux 側のディスク)へ移す
2. ソースの8フォルダを `src/` の下へ移す(`ba7ff5f`)。`mocks/`・`public/`・`scripts/`・`docs/` と設定ファイルはルートに残す
3. import の別名は `@/*` → `./src/*`、ルートの `mocks/` を指す `@mocks/*` を足す(`tsconfig.json` の `paths` と
   `vitest.config.ts` の `alias` の両方)。`src/lib/` の `../mocks/` 系の相対 import 29行を `@mocks/` に置き換えた
4. 受入検証はこれからも dev サーバーではなく、`npm run build` の `out/` を静的配信して行う(E2E は 4173)。
   理由はもう inotify ではなく、GitHub Pages が配るのが同じ静的書き出しだから。配信物と同じものを検査する

## Consequences

- `/mnt/c` に由来する制約(dev サーバーの監視の取りこぼし、Vitest の watch が使えない)は無くなった。
  文書と `vitest.config.ts` の注釈からその記述を消した。移した後の dev サーバーがファイルの変更を拾うことは
  2026-10-12 の作業中に見ているが、inotify のイベント数は測り直していない
- 文書・スクリプトの参照パスを `src/` 基準に直した。古いパスが文書に残ると `scripts/check-docs.mjs` が落とす
- エージェントの worktree は `.claude/worktrees` の下にできる(`.gitignore` 済み)。その下のファイルは、
  ignore の指定に `.claude/` を含む場所から Prettier を走らせると黙って検査から外れる(`docs/pitfalls.md`)

## Alternatives Considered

- **`/mnt/c` に置いたまま、静的配信だけで検証を続ける** — 利用者が J-paku.github.io と統一すると決めて退けた。
  それ以外の理由の記録は無い
- **ソースをルート直下に置いたまま位置だけ移す** — 同じく統一の決定で退けた
