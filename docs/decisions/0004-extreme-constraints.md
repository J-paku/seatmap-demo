# 0004. 人はコードを読まず、制約(テスト・検査)を極端に置いて、すべて通ったものを信頼する

## Status

Accepted(2026-10-12、利用者の決定)。J-paku.github.io の ADR 0011(方針)・0013(変異テストの走らせ方)・
0014(対象を純粋モジュールの全部にする)と同じ形をこのリポジトリに置く

一部は Superseded by [0007](0007-browser-integration-containers.md)(2026-10-16 から)。「テストの境界」の「フックの振る舞いは E2E が見る」と
Consequences の「振る舞いは E2E だけが見る」は、フックをそれを使うコンテナの統合テストでも見る形に替わった。
「フックはカバレッジも測らない」のうち統合テストの側は、統合のカバレッジがフックも測る形に替わった。
単体のカバレッジがフックを測らないこと・`hooks` フォルダに単体テストを置かないこと・`renderHook` を使わないことは、この記録のまま

## Context

- 決める前の CI の門は typecheck・lint・単体テスト・build と、別ジョブの knip だけだった。
  単体テストは `src/utils/`・`src/lib/` の下だけを走らせ、カバレッジも変異テストも無かった
- 受入検証は手で走らせる運転台だけで、CI に入っていなかった([0003](0003-playwright-e2e.md))
- J-paku.github.io は 2026-10-10〜11 に、人がコードを読んでレビューしない代わりに制約を極端に置く方針を採っている

## Decision

### 方針

**人はコードを読んでレビューしない。制約を極端に多く置き、すべて通ったものを信頼する。**
「完了」はレビューではなく、すべての門を通ったことで言う(走らせ方は `docs/agents/verification.md`)。

### 置いた制約

数値と対象の正本は各行の設定ファイルで、ここは 2026-10-12 時点の写し。

| 制約 | 落とすもの | 正本 |
|---|---|---|
| `npm run typecheck` / `npm run lint` | 型の食い違い・Lint 違反 | `tsconfig.json`・`eslint.config.mjs` |
| `npm run format:check` | 書式の崩れ([0002](0002-prettier.md)) | `.prettierrc` |
| `npm run test:coverage` | 単体テストの失敗、全体の床割れ、純粋モジュールが1ファイルでも文・分岐・関数・行の100%を割ること | `vitest.config.ts`・`scripts/gate-targets.mjs` |
| `npm run test:boundary` | `hooks` フォルダの下の単体テストと、src のどこかでの `renderHook` | `scripts/check-test-boundary.mjs` |
| `npm run test:mutation` | 単体テストが見抜けない変異体が1体でも残ること(`break` 100) | `stryker.config.mjs` |
| `npm run knip` | 使われていないファイル・export・依存 | `knip.json` |
| `npm run test:e2e` | 実ブラウザでの受入条件の崩れ | `playwright.config.ts`・`tests/` |
| Lighthouse CI | 点数の下限割れ([0006](0006-lighthouse-ci.md)) | `lighthouserc.json` |

### 門の対象(ファイル別100%と変異100%)

- 対象は純粋モジュールの置き場の `.ts` の全部。`src/lib/`・`src/utils/`・`src/components/` の下の `utils` フォルダ。
  `lib` は外との入出力の置き場だが、利用者の方針で `utils` と同じく門に入れる
- 一覧を手で並べない。`scripts/gate-targets.mjs` が読み込まれるたびに `src` をたどって規則で選ぶ。
  新しいファイルは置いた時点で対象になる。規則の故障で対象が黙って減らないよう、同じファイルが自己検査する
  (規則の判定・名指ししたパスの実在・置き場ごとの件数の下限)
- 外すのはテスト・`*.d.ts`・`*.fixture.ts`・`*.test-helper.ts`・`hooks` フォルダの下だけ

### テストの境界

- `hooks` フォルダの下に単体テストを置かない。どのテストでも `renderHook` を使わない。例外の一覧は持たない
- フックはカバレッジも測らない。フックの振る舞いは E2E が見る。だからロジックはフックに残さない([0005](0005-hooks-hold-only-use.md))

### 見分けられない変異体(等価変異)の扱い

- `// Stryker disable` で黙らせない。結果を変えない書き方(届かない分岐・重なる守り・結果を変えない早期 return など)を、
  同じ動きの別の書き方へ直して変異体ごと消す(例: `a5bd80c` の isSameView、`2a8ebfe` の markSeen)。
  2026-10-12 の時点で `src`・`scripts` に `Stryker disable` は1つも無い
- 読み込む時に投げる変異体は、テストの import が失敗して生き残りと数えられる。そういうモジュールのテストは
  `vi.resetModules()` の後に `await import(...)` で読む(`stryker.config.mjs` の注釈)

### 変異テストの走らせ方

- commit の前には走らせない(git のフックは置かない)
- push(CI)では `incremental` で前回の結果を引き継ぎ、変わった変異体だけを走らせる。CI はその結果ファイルを
  キャッシュで持ち回る。鍵は `package-lock.json`・`stryker.config.mjs`・`vitest.config.ts` の指紋で、どれかが変わると全部が走る
- 全体は週1回、手で `npm run test:mutation -- --force` を走らせる

### 制約は上げる方向にだけ動かす

下限を下げる・テストを消す・門の対象から外す・テストの境界を変えるには、新しい ADR が要る。上げる方向は ADR 無しでよい。

## Consequences

- 2026-10-12 の実測: 変異テストの全体(`--force`)は132ファイル・6451体で、落とした6409体・時間切れ42体・生き残り0、
  5分19秒。単体テストは1600件台。全体の床は実測(statements 53.71%・branches 37.05%・functions 45.39%・lines 51.57%)から
  2pt 引いて切り捨てた 51・35・43・49
- 1つのテストだけで測ると、ファイル別100%の対象144ファイルが落ちることを確かめた(`2c5f452`。門が効いていることの確認)
- `incremental` は対象のファイルとテストしか比べない。対象が import する別のファイルだけが変わった push では、
  新しい生き残りを次の全体の実行まで見落としうる。埋めるのは週1回の `--force` で、人の手に頼る
- フックはカバレッジの分母から外れ、振る舞いは E2E だけが見る。制約が見ていない所(見た目・文言の妥当さなど)は誰も確かめない

## Alternatives Considered

- **対象を手で並べ、新しいファイルを作るたびに足す**(J-paku の 0011 の最初の形) — 足し忘れると黙って門の外に残るので採らない
- **push のたびに変異体を全部走らせる** — J-paku の 0013 が時間を理由に退けた形で、その決定にそろえた。
  このリポジトリで2つの走らせ方を比べた実測は無い
- ほかに比べた案の記録は無い
