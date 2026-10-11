# 0002. 書式を Prettier(J-paku.github.io と同じ設定)でそろえ、format:check を門に置く

## Status

Accepted(2026-10-12)

## Context

- 書式を機械で確かめる手段が無かった。セミコロン・クォートなどの一部だけを、エージェントの自動検査フック
  (`.claude/code-rules.json`)が見ていた
- J-paku.github.io は Prettier を入れ、`npm run format:check` を CI の門に置いている

## Decision

1. 設定は J-paku.github.io と同じ `.prettierrc`(シングルクォート・JSX もシングルクォート・セミコロン無し・100桁・
   `trailingComma: es5`・`arrowParens: avoid`)
2. 対象は `src` の ts・tsx・css、`scripts` の mjs・js、`tests` の ts(正本は `package.json` の `format` / `format:check`)
3. 導入時に全ファイルを1コミットで整形した(`d759570`。整形だけで役割が1つなので300行を超えても分けない)
4. `npm run format:check` を `npm run verify` と CI(`.github/workflows/ci.yml`)の門に置く

## Consequences

- 書式の崩れは CI で落ちる。直すのは `npm run format`
- Markdown・JSON は対象外。文書の整形は Prettier では見ない
- `.claude/worktrees` の下で走らせると、走らせる場所の ignore の指定次第で検査が黙って0件になる。
  worktree で確かめるときは `--ignore-path /dev/null` を付ける(`docs/pitfalls.md`)

## Alternatives Considered

- 比べた案の記録は無い
