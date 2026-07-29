# ディレクトリ規約

コードエージェント向けの配置ルール。**新しいファイルを作る前に必ずここを見る。**

## 判断フロー

新しいコードをどこへ置くかは、次を上から順に当てはめる。最初に当たった所へ置く。

| 問い | Yes なら |
|------|----------|
| React コンポーネントか(JSX を返す) | `components/` |
| React Context + Provider か | `contexts/` |
| `use` で始まり React フックを内部で呼ぶか | `hooks/` |
| アプリの外(ネットワーク・永続ストレージ・第三者SDK)と話すか | `lib/` |
| 型定義だけか | `types/` |
| 上のどれでもない = 入力から出力を返すだけの純関数・定数 | `utils/` |

## lib と utils の違い

ここが一番間違えやすいので明示する。

- **`lib/`** — アプリ**外部**のシステムとの接続。非同期・副作用・第三者依存を持つ「重い」レイヤー。
  DB クライアント、APIクライアント、認証、ストレージ I/O、データ取得層。
- **`utils/`** — 外部に触らない**純粋な**ヘルパー。同じ入力なら常に同じ出力を返す、小さくて軽い関数と定数。

判定に迷ったら「**これはアプリの外に出て行くか?**」だけを見る。出て行くなら `lib/`、出ないなら `utils/`。

DOM の実測・`matchMedia`・`element.style` の書き換えは「外」に入らない。
これらは画面という同じ世界の中の話なので、純粋な計算と一緒に `utils/` に置いてよい。
「外」とは fetch・localStorage・IndexedDB・第三者SDK のように、**アプリが落ちても残る側**を指す。

本リポジトリでの実例:

| 置き場 | ファイル | 理由 |
|--------|----------|------|
| `lib/` | `fetch-mock.ts` | 擬似APIレイヤー(遅延付きの取得) |
| `lib/` | `mock-loader.ts` | SWR によるデータ取得層 |
| `lib/` | `layout-persistence.ts` | localStorage への読み書き |
| `utils/` | `geometry.ts` | 座標変換の計算だけ |
| `utils/` | `presence.ts` | 予定配列 → 在席状態の導出だけ |
| `utils/` | `kana.ts` | 検索用の文字列正規化だけ |

> `lib/` に純関数を置かない。`utils/` に fetch や localStorage を書かない。
> この2つを混ぜた時点で「どこを見ればI/Oが分かるか」が失われる。

## フックを `lib/` に置かない

`use` で始まるものは常に `hooks/`。`lib/` にも `utils/` にも置かない。
例外は**データ取得フック**で、これは取得層と一体なので `lib/mock-loader.ts` に同居してよい。

## 1ファイルが混ざっている時は割る

1つのファイルがフックと純関数の両方を export しているなら、責務ごとに割って別々の置き場へ移す。

```
lib/team-colors.ts            ← 純関数 + useTeamColorMap が同居していた
  ↓
utils/team-colors.ts          buildTeamColorRegistry / resolveTeamColor / nextTeamHue
hooks/use-team-color-map.ts   useTeamColorMap
```

Context ファイルが日付計算のような純関数まで抱えている場合も同じ。純関数は `utils/` へ出す。

## コンポーネント単位の分割

1ファイルが **200行を超え、かつ責務が複数ある**なら、コンポーネント名のフォルダへ割る。

```
components/<Name>/
  index.tsx     組み立てのみ。ロジックは持たない
  type.ts       型は平坦にここへ(サブフォルダを切らない)
  components/   このコンポーネント専用の下位部品
  hooks/        このコンポーネント専用のフック
  utils/        このコンポーネント専用の純関数・定数
```

- ルート直下と同じ名前・同じ意味でフォルダを使う。**ローカルに `lib/` は作らない** — 外部接続はアプリで1箇所に集約したいので必ずルートの `lib/` に置く
- 2つ以上のコンポーネントが使い始めた時点で、ルート直下の `hooks/` `utils/` へ引き上げる
- `pages/*.tsx` はルート定義専用。画面本体は `components/<Name>/` に置き、ページは `Head` とプロバイダだけにする
- **単一責務のまま長いだけのモジュール(フック1本など)は割らない。** 割ると読みにくくなる

## import alias

- 兄弟 `./` / 同じツリー内 `../` / ツリーを跨ぐ `@/`
- ツリーを跨ぐ時は必ず `@/hooks/...` `@/utils/...` のように置き場が分かる形で書く

## 出典

- [Understanding the Role of libs and utils in a Next.js 15 Project](https://khaisastudio.medium.com/understanding-the-role-of-libs-and-utils-in-a-next-js-15-project-b1c0368ef044)
- [The Ultimate Guide to Organizing Your Next.js 15 Project Structure](https://www.wisp.blog/blog/the-ultimate-guide-to-organizing-your-nextjs-15-project-structure)
- [Next.js directory organization best practices (Sentry)](https://sentry.io/answers/next-js-directory-organisation-best-practices/)
- [React Folder Structure Best Practices (Robin Wieruch)](https://www.robinwieruch.de/react-folder-structure/)
