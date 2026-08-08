# AGENTS.md — 文書ルーター

「今何をしようとしているか」で開く文書を決める。ここには規則の中身を書かない、開く場所だけを示す。
不変ルール・完了条件・コミット規則は `CLAUDE.md` にある。

## 状況 → 開く文書

| 状況 | 開く文書 |
|---|---|
| 新しいファイルをどこに置くか迷う(フォルダ構成・`lib`/`utils`の境目・import alias) | `docs/structure.md`。技術非依存の判断基準(配置フローチャート・分割基準・命名規則の考え方)は `~/.claude/rules/01-authoring.md` |
| フック/コンポーネントをどう書くか迷う(命名・SRP分割パターン・コードスタイル) | `docs/authoring.md` |
| 既存ファイルを直す。触ってよい範囲を確認したい | `~/.claude/rules/01-authoring.md` 7.(要求に直結する行だけを変える) |
| CSS・スタイル・色トークンを書く/直す | `docs/styling.md`(Tailwind / CSS Modules / `styles/` 残留グローバルの3系統の使い分け・デザイントークン・ハネスのセレクタ規則) |
| 座席マップ(キャンバス・パンズーム・チーム箱)の画面仕様を知りたい | `docs/seat-map/spec.md`(画面・相互作用の仕様)、`docs/seat-map/architecture.md`(構成・データフロー・DOM フック) |
| チームオーバーレイ(座席グリッド・ミニマップ・HIT)の画面仕様を知りたい | `docs/team-overlay/spec.md`(画面・相互作用の仕様)、`docs/team-overlay/architecture.md`(構成・データフロー・DOM フック) |
| 社員詳細・社員ディレクトリ・会議室詳細・レイアウト編集・アバターカスタマイズの画面仕様を知りたい | `docs/employee-detail/` `docs/employee-directory/` `docs/facility-detail/` `docs/layout-edit/` `docs/avatar-customizer/` — **未執筆**(該当コードは別セッションで改修中)。当面は該当 `components/` 配下を直接読む |
| 構築当初の段階仕様書(不変ルール5. の対象)を確認したい | `~/seatmap-demo-spec/ROUTING.md` — 指定された段階の文書だけを開く |
| 自動検査フック(`.claude/code-rules.json`)を変えた | 設定と文書を一組で直す。文書は `docs/authoring.md`(コードスタイル表) |
| 検証したい(受入条件・ハネススクリプト) | `docs/seat-map/testing.md`、`scripts/verify-s1.js`。タイプチェックで拾えないものや PASS 再確認の手順など判断が必要な原則は `~/.claude/rules/02-verifying.md` |
| 「完了」と言う前 | `CLAUDE.md` の完了条件を満たしたか確認する。検証の考え方・報告形式は `~/.claude/rules/02-verifying.md` |
| 過去の事故事例を調べたい | `docs/pitfalls.md`(このリポジトリ固有)。技術非依存の一般的な事故事例は `~/.claude/rules/03-pitfalls.md` |
| デプロイ・公開URL・ビルド手順を確認したい | `README.md`(ローカル実行・GitHub Pages ビルド)。`docs/deploy.md` は**未執筆** |
