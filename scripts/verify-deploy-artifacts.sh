#!/usr/bin/env bash
# 配信ディレクトリの自己整合性を検査する。
#
# 見るのは1点だけ — HTML が参照する css/js が同じツリーに実在するか。
# 2026-08-08 に「HTML だけ更新されず chunk 名だけ入れ替わる」壊れ方で配信が丸ごと死んだ。
# chunk 名は content-hash なので毎ビルド変わるが、HTML は名前が固定でサイズも一定
# (ハッシュが13文字固定なので index.html のバイト数が変わらない)ため、
# rsync のサイズ+mtime クイックチェックに掛かって転送が飛ばされうる。
# ワークフローは全て緑で通り、404 になるのは配信後のブラウザだけだった。
#
# 使い方: bash scripts/verify-deploy-artifacts.sh <配信ディレクトリ> <basePath>
#   例: bash scripts/verify-deploy-artifacts.sh .gh-pages /seatmap-demo
set -euo pipefail

dir=${1:?配信ディレクトリを渡す}
base=${2:?basePath を渡す(例 /seatmap-demo)}

if [ ! -d "$dir" ]; then
  echo "verify-deploy-artifacts: ディレクトリが無い: $dir" >&2
  exit 1
fi

# HTML 内の basePath 付き参照を全て集める。href/src だけでなく
# インライン JS 内の chunk 一覧も拾うため、属性ではなくパス形にマッチさせる
refs=$(
  grep -rhoE "${base}/[A-Za-z0-9_./-]+\.(css|js)" --include='*.html' "$dir" |
    sed "s|^${base}/||" |
    sort -u
)

if [ -z "$refs" ]; then
  # 参照が0件なら「全部揃っている」ではなく「検査できていない」。
  # 空の検査リストを PASS にすると、この検査自体が無いのと同じになる
  echo "verify-deploy-artifacts: 参照が0件。basePath が違うか HTML が無い" >&2
  exit 1
fi

missing=0
checked=0
while IFS= read -r ref; do
  checked=$((checked + 1))
  if [ ! -f "$dir/$ref" ]; then
    echo "missing: $ref"
    missing=$((missing + 1))
  fi
done <<<"$refs"

echo "verify-deploy-artifacts: 参照 ${checked}件 / 欠落 ${missing}件"

if [ "$missing" -ne 0 ]; then
  echo "配信物が自己矛盾している。HTML と成果物の世代がずれている" >&2
  exit 1
fi
