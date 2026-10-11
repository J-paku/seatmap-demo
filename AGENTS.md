# AGENTS.md — 文書ルーター

「今何をしようとしているか」で開く文書を決める。ここには規則の中身を書かない、開く場所だけを示す。
不変ルール・完了条件・コミット規則は `CLAUDE.md` にある。

## 状況 → 開く文書

| 状況 | 開く文書 |
|---|---|
| 新しいファイルをどこに置くか迷う(フォルダ構成・`lib`/`utils`の境目・フックのファイルに置いてよいもの・import alias) | `docs/structure.md`。技術非依存の判断基準(配置フローチャート・分割基準・命名規則の考え方)は `docs/conventions/01-authoring.md` |
| フック/コンポーネントをどう書くか迷う(命名・SRP分割パターン・コードスタイル) | `docs/authoring.md` |
| 既存ファイルを直す。触ってよい範囲を確認したい | `docs/conventions/01-authoring.md` 7.(要求に直結する行だけを変える) |
| CSS・スタイル・色トークンを書く/直す | `docs/styling.md`(Tailwind / CSS Modules / `src/styles/` 残留グローバルの3系統の使い分け・デザイントークン・ハネスのセレクタ規則) |
| 座席マップ(キャンバス・パンズーム・チーム箱)の画面仕様を知りたい | `docs/seat-map/spec.md`(画面・相互作用の仕様)、`docs/seat-map/architecture.md`(構成・データフロー・DOM フック) |
| チームオーバーレイ(座席グリッド・ミニマップ・HIT)の画面仕様を知りたい | `docs/team-overlay/spec.md`(画面・相互作用の仕様)、`docs/team-overlay/architecture.md`(構成・データフロー・DOM フック) |
| 社員詳細・社員ディレクトリ・会議室詳細・レイアウト編集・アバターカスタマイズの画面仕様を知りたい | 文書は**未執筆**。当面は `src/components/` の該当フォルダを直接読む |
| 構築当初の段階仕様書(不変ルール5. の対象)を確認したい | `~/seatmap-demo-spec/ROUTING.md`(リポジトリ外の参考資料。無くても作業できる) — 指定された段階の文書だけを開く |
| 自動検査フック(`.claude/code-rules.json`)を変えた | 設定と文書を一組で直す。文書は `docs/authoring.md`(コードスタイル表) |
| 何を走らせて確かめるか・「完了」と言う前 | `docs/agents/verification.md`(変えたもの別の検査・変異テストの走らせ方・完了の条件・配信版の E2E)。検証の考え方・報告形式は `docs/conventions/02-verifying.md` |
| E2E(`tests/`)を足す・直す・落ちた | `docs/agents/verification.md`(E2E の一覧と走らせ方) → `docs/seat-map/testing.md`(注入する判定と各 spec の中身) |
| チームオーバーレイの受入条件を確かめる(E2E に入っていない検証) | `docs/team-overlay/testing.md` |
| Lighthouse CI が落ちた・下限を変える | `docs/quality/performance.md` |
| 「なぜこの作りなのか」を知りたい・既存の設計(構成・門・制約)を置き換えたい | `docs/decisions/README.md` |
| 文書そのものを直す | 直したら `npm run docs:check`(リンク・参照パス・`npm run` 名・孤児・E2E 一覧を確かめる) |
| 過去の事故事例を調べたい | `docs/pitfalls.md`(このリポジトリ固有)。技術非依存の一般的な事故事例は `docs/conventions/03-pitfalls.md` |
| デプロイ・公開URL・ビルド手順を確認したい | `README.md`(ローカル実行・GitHub Pages ビルド)と `.github/workflows/deploy-pages.yml`。配信の手順書は**未執筆** |

## 読まなくてよいもの

- `docs/` を再帰的に読まない。上の表が指した文書と、その文書が明示的に指した先だけを開く
- `docs/decisions/` は通常の作業では読まない。読むのは既存の設計を置き換えるとき・理由を問われたときだけ
- `.claude/worktrees` の下はエージェントの作業用の複製(`.gitignore` 済み)。参照しない
