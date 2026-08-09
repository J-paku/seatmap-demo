# seat-map デモ

企業向け座席マップアプリを、モックデータのみで忠実に再現した公開ポートフォリオです。バックエンドは一切持たず、全ての動作がクライアント側で完結します。

**公開URL**: https://j-paku.github.io/seatmap-demo/

## これは何か

フロアの座席・チーム区画・会議室配置を表示し、社員検索や在席状況の確認、座席レイアウトの編集(ドラッグ移動・チーム変更・削除)、自分のアバターのカスタマイズができる座席マップアプリです。予定をGaroonで見て座席は別の一覧から探す、という往復を毎日していたのが出発点で、「今この人はどこにいるのか」に1画面で答えることを狙っています。データは全て `mocks/` 配下の決定論的な生成データで、実在の組織・個人情報は含みません。

## 技術スタック

| 分類 | 技術 | バージョン |
|---|---|---|
| フレームワーク | Next.js (Pages Router) | 16.2.12 |
| UI | React / React DOM | 19.2.4 |
| 言語 | TypeScript | 5.9.3 |
| スタイル | Tailwind CSS (PostCSSプラグイン方式) | 4.3.3 |
| データ取得 | SWR | 2.4.2 |
| ユーティリティ | clsx / tailwind-merge | 2.1.1 / 3.6.0 |
| Lint | ESLint | 9.39.5 |

出力は静的export(`next build` → `out/`)で、GitHub Pages のプロジェクトサイト(`/seatmap-demo` サブパス)にそのまま配信しています。

## ローカルでの実行

```bash
npm install
npm run dev
```

http://localhost:3000 で表示を確認できます。

```bash
npm run build   # 静的export(out/ を生成)
npm run start   # next start(SSRサーバー。参考用。実配信はout/の静的ホスティング)
npm run lint
```

GitHub Pages 向けの basePath 付きビルドを手元で再現する場合は次のように環境変数を付けます。

```bash
GITHUB_PAGES=true npm run build
```

## ディレクトリ構成

```text
seatmap-demo/
├── pages/          # ルーティングエントリ(index.tsx など)。ページ単位の組み立てのみ担当
├── components/     # UIコンポーネント(座席マップキャンバス・各種パネル・編集用UIなど表示専用)
├── lib/            # 通信・副作用層(モックfetchラッパー・状態管理フックなど)
├── mocks/          # モックデータ(社員・チーム・座席・スケジュール・会議室のJSON)。実データは含まない
├── styles/         # 全体CSS(globals.css)とパート別CSS
├── public/         # 静的アセット(favicon など)
├── scripts/        # モックデータ生成・検証スクリプト
├── next.config.mjs
├── postcss.config.mjs
└── tsconfig.json
```

## デモ上の意図的な代替実装

実サービスであればサーバー側で担う機能を、デモとして以下のように代替しています。

- **レイアウト・アバターの永続化**: サーバー保存の代わりに `localStorage` に保存。ブラウザを変えると保存内容は引き継がれない
- **アバターのAI生成**: 実際の画像生成APIは呼ばず、入力テキストのハッシュ値から固定候補12件の中の1つを選ぶモック。ネットワーク通信は発生しない
- **管理者権限**: 実際の認証・権限管理の代わりに、画面右上の役割トグル(閲覧⇄編集)で編集モードの有無を切り替えるのみ

## モックデータの検査

会議室は同じ時間帯に二重予約できず、定員も超えられません。これはコードの分岐ではなくデータ側の条件なので、型チェックでも画面確認でも落ちません。次のスクリプトで機械的に見ます。

```bash
node scripts/verify-schedule-facility.mjs   # verdict: PASS / FAIL
```

`node scripts/generate-mocks.mjs` でモックを作り直したあとは必ず走らせてください。

## 補足

このリポジトリ自体の作業ルール(コミット規約・コーディング規約など)は `CLAUDE.md` を参照してください。
