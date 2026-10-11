# 0003. 受入検証の運転台を Playwright の E2E へ移す(「Playwright を入れない」方針を覆す)

## Status

Accepted(2026-10-12、利用者の決定)。`65b29ae`(2026-08-12)で運転台 `run-all-checks.mjs` と一緒に書いた
「Playwright は `package.json` に依存として追加しない」方針を置き換える

## Context

- 受入検証の判定の本体は、画面へ注入するスクリプト `scripts/verify-*.js`(`verify-s1.js`・`verify-edit-anchors.js`・
  `verify-ghost.js` など)にある。それを画面状態ごとに注入する運転台が3本あった:
  `scripts` フォルダの `run-all-checks.mjs`・`run-ghost-checks.mjs`・`verify-offscreen-indicator.mjs`(どれも今は無い)
- 運転台は Playwright を隣の J-paku.github.io の `node_modules` から借りていた(`PLAYWRIGHT_NODE_MODULES`)。
  入れない方針の理由は、書いた文書にもコミットにも残っていない
- 運転台は手で走らせるだけで、CI の門(typecheck・lint・test・build と knip)には入っていなかった
- 同じ日に、人がコードを読まない代わりに制約をすべて CI の門に置く方針を採った([0004](0004-extreme-constraints.md))

## Decision

1. `@playwright/test` を devDependencies に入れ、E2E を `tests/*.spec.ts` に書く(設定は `playwright.config.ts`)
2. 判定の本体 `scripts/verify-*.js` は動かさない。spec が画面状態を作り、`page.evaluate` で注入して結果を断言する。
   spec が持つのは到達手順と断言だけ
3. 運転台3本を spec へ移して消す。判定の数は移す前と同じ(`tests/edit-anchors.spec.ts` 60件・
   `tests/ghost-placement.spec.ts` 361件・`tests/offscreen-indicator.spec.ts` 18件。`ac0ed8d`・`278d8fc`・`0b39927`)
4. 配信は `out/` を `npx serve` で配る。ポートは `E2E_PORT`(既定 4173)。走る前に、配信中の `/` がこの
   チェックアウトの `out/index.html` と同じかを照合し、違えば止める(`tests/global-setup.ts`。別の worktree の
   ビルドを検査して全部緑になる事故を止める)
5. `E2E_BASE_URL` を渡すと配信版(GitHub Pages)を検査する。このときは手元のサーバを起こさず、照合もしない
6. 計測(GoatCounter)は二重に止める。どの context でも `gc.zgo.at`・`*.goatcounter.com` への要求を `route` で落とし、
   `localStorage` に `skipgc` を立てる(`tests/seatmap.helpers.ts`)
7. 再試行はしない(`retries: 0`)。CI では `test.only` の混入を落とす。手元のワーカーは4本
8. CI ではビルドの後に E2E を走らせる。ブラウザは `package-lock.json` の指紋でキャッシュする

## Consequences

- 受入検証が CI の門に入った。手元・CI・配信版で同じ spec を走らせる
- 「Playwright のハーネスはリポジトリに置かず、セッションごとに作っては捨てる」運用は終わった
- `npx playwright install` は、同じ機械の他のリポジトリと共有する `~/.cache/ms-playwright` を書き換える。
  版の違うリポジトリのブラウザが消えることがある(`docs/pitfalls.md`)
- リポジトリの外の `~/dev/.seatmap-port/` のスクリプト(チームオーバーレイの HIT 解除・ミニマップなど)は
  E2E へ移していない。それらは今も手で走らせる(`docs/team-overlay/testing.md`)

## Alternatives Considered

- **運転台を J-paku.github.io の Playwright を借りたまま手で走らせ続ける** — CI の門に置けないので採らない
- **判定の本体も spec へ書き写す** — 採らなかったが、理由の記録は無い(注入スクリプトは今も devtools へ貼れば
  単体で走る作りのまま)。ほかに比べた案の記録は無い
