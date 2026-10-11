# 0005. フックのファイルには use 関数とその型だけを置き、定数まで utils・lib へ出す

## Status

Accepted(2026-10-12、利用者の決定「定数まで全部」)。[0004](0004-extreme-constraints.md) のテストの境界から導く置き場の規則

## Context

- [0004](0004-extreme-constraints.md) で `hooks` フォルダは単体テストもカバレッジも変異テストも見ない層になった。
  フックの中に残ったロジック・定数は、E2E がたまたま通る所しか確かめられない
- 決めた時点のフックには、しきい値・待ち時間・セレクタ・文言の組み立て・`localStorage` の読み書きなどが混ざっていた

## Decision

1. フックのファイル(`hooks` フォルダの下)に置けるのは、`use` で始まる関数と、その引数・戻り値の型だけ
2. フックでない関数と定数は、**しきい値1つ・時間1つでも**一番近い `utils` フォルダへ出す。
   1つのコンポーネントだけが使うならそのコンポーネントの `utils`、共通なら `src/utils/`
3. 外との読み書き(`localStorage`・`sessionStorage`・クリップボードなど)は `src/lib/` へ出す。コンポーネントの中に `lib` は作らない
4. 2か所以上が使うようになったら `src/` 直下の `utils`・`lib` へ上げ、写しを残さない

## Consequences

- 2026-10-12 に、この規則でフックから外へ出すコミットを1フックずつ積んだ。例:
  - 定数を一番近い utils へ: `2ff1364`(useLongPress のしきい値 → detect-long-press.ts)、
    `ad7ce9c`(チームオーバーレイの光らせる時間 → コンポーネントの utils の time-seat-highlight.ts)
  - 保存の読み書きを lib へ: `401045d`(テーマ → persist-theme.ts)、`4e1fd9b`(ミニマップの開閉 → store-minimap-collapse.ts)
  - 2か所目が出たので上げる: `e81dc9f`(保存の疑似遅延 → save-delay.ts)、`da67d0a`(所属部署名の正規化 → unassigned-department.ts)
- 出した先は `scripts/gate-targets.mjs` の規則で自動的にファイル別100%・変異100%の対象になる。フックは配線だけになる
- この規則そのもの(フックのファイルに `use` 関数以外が無いこと)は、2026-10-12 の時点で機械では検査していない。
  `[hook-file-naming]` が見るのはファイル名だけである

## Alternatives Considered

- **計算の関数だけを出し、定数はフックに残す** — 利用者が「定数まで全部」と決めて退けた。
  理由はそれ以外に記録が無い
