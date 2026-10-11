# performance.md — Lighthouse CI の基準と根拠

**Lighthouse CI が落ちた時、その基準を変える時に読む。**
測る経路・回数・各分類の下限の正本は `lighthouserc.json`。この文書はその値の根拠だけを持つ。

## 1. 測っているもの

- 経路は `/` だけ(静的エクスポートのページはこれと 404 しかない)。モバイルの既定設定で3回測り、
  判定は3回のうち中央値の回で見る(`aggregationMethod: median-run`)
- `/` を開くと**ログインゲート**が出る。通過の印は sessionStorage にあり(`src/lib/session-auth.ts`)、
  LHCI の既定の手順にはそれを撒く手段が無いので、**測っているのはゲートの画面**。
  座席マップの JS は同じページの束(118KiB のチャンク1本)に入っているので転送と解析は含まれるが、
  マップの描画とデータの取得は含まれない
- 報告は外へ上げない(`upload` を設定しない)。公開の一時保管先へ載せないため

## 2. 実測と下限

2026-10-12 のローカル実測。`main`(a9538f4)の `out/` を配信し、`@lhci/cli@0.15.1`
(Lighthouse 12.6.1)・Chromium 153 で3回ずつを3組測った。

| 組 | 機械の状態(benchmarkIndex) | performance | 中央値 |
|---|---|---|---|
| 1 | 空き(2222〜2408) | 98・96・98 | 98 |
| 2 | 別の変異テストが全コアを使用中(1098〜1174) | 55・55・55 | 55 |
| 3 | 同上(1462〜1725) | 93・96・93 | 93 |

accessibility・best-practices・seo は9回とも100。

| 分類 | 一番低い中央値 | 下限 |
|---|---|---|
| performance | 55 | 0.5 |
| accessibility | 100 | 0.95 |
| best-practices | 100 | 0.95 |
| seo | 100 | 0.95 |

- 下限は各分類で一番低い中央値から5pt引いた値(J-paku.github.io と同じ決め方)
- 3組とも今の下限で `lhci assert` が通る。performance の下限を 0.56 にすると組2で落ちることも確かめた
- CI の実行機では成績(特に performance)が手元と違うことがあるので、最初の CI の実測を見て
  下限を直すことがある

## 3. performance が 55 と 95 前後に割れる理由

ゲートの画面は Material Symbols Rounded を読む(`src/pages/_document.tsx` で全軸を要求するので
woff2 1本が 5,272KiB、優先度 VeryHigh)。Lighthouse の既定のシミュレーションは、
**実際の初回描画より前に取得が終わった VeryHigh の要求**を FCP の依存に数え、低速4G 換算で計り直す
(`@paulirish/trace_engine` の `lantern/metrics/FirstContentfulPaint.js`)。

| 実際の初回描画 | フォントの取得完了 | 換算後の FCP | performance |
|---|---|---|---|
| 166〜236ms(組1・3) | 649〜735ms(描画より後) | 1.6s | 93〜98 |
| 1243〜1317ms(組2) | 789〜807ms(描画より前) | 28.7s | 55 |

9回すべてがこの境目どおりに分かれた。初回描画が遅れる実行機では低い方になるので、下限は低い方に合わせた。
下限を上げたいなら、先にこのフォントを軽くする(未着手・未検証)。

## 4. 手元で測る(WSL)

`npm run build` の `out/` を 4173 で配信してから、**リポジトリの外の空のフォルダ**で走らせる。
cwd に `.lighthouseci/` と Chrome のプロフィールのフォルダ(`C:\Users\…\lighthouse.<数字>`、
1回の collect で3個)が残るため。ブラウザは Playwright の Linux 版 Chromium を渡す。

```bash
CHROME_PATH=$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome | tail -1) \
  npx -y @lhci/cli@0.15.1 collect --config=<repo>/lighthouserc.json
npx -y @lhci/cli@0.15.1 assert --config=<repo>/lighthouserc.json
```
