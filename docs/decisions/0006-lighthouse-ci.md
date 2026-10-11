# 0006. Lighthouse CI の測り方と下限

## Status

Accepted(2026-10-12、`85d2676`)。数値の正本は `lighthouserc.json`、根拠の詳細は [../quality/performance.md](../quality/performance.md)

## Context

- 性能・アクセシビリティ・ベストプラクティス・SEO の点数を見る門が無かった
- J-paku.github.io は Lighthouse CI を CI の門に置き、下限を「一番低い中央値から5pt 引いた値」で決めている
- 静的書き出しのページは `/` と 404 しかない。`/` を開くとログインゲートが出て、その通過の印は sessionStorage にある

## Decision

1. 測るのは `/` だけ。モバイルの既定設定で3回測り、3回の中央値の回で判定する(`aggregationMethod: median-run`)
2. 下限は 2026-10-12 の手元の実測(3回×3組)の一番低い中央値から5pt 引いた値:
   performance 0.5・accessibility 0.95・best-practices 0.95・seo 0.95
3. 報告は外へ上げない(`upload` を設定しない)。公開の一時保管先へ載せないため
4. CI では E2E の後に `out/` を 4173 で上げ直して測る。CLI の版は `@lhci/cli@0.15.1` に固定する(`.github/workflows/ci.yml`)

## Consequences

- 測っているのはログインゲートの画面で、座席マップの描画とデータの取得は含まれない(JS の転送と解析は含まれる)
- performance は機械の混み具合で 55 と 95 前後に割れる。重い Web フォントの取得が初回描画の前に終わるかどうかで
  Lighthouse の FCP の見積もりが変わるため(詳細は `docs/quality/performance.md` 3.)。下限は低い方に合わせた
- performance の下限を 0.56 にすると組2(55)で落ちることを確かめた
- CI の実行機の成績は手元と違いうる。最初の CI の実測を見て下限を直すことがある

## Alternatives Considered

- **performance の下限を高い方(90 前後)に置く** — 機械が混んだ組で落ちるので採らない。上げたいなら先にフォントを軽くする(未着手)
- ほかに比べた案の記録は無い
