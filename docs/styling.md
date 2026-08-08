# styling.md — CSS・色の書き分け規則(seatmap-demo 固有)

スタイルの置き場、クラス命名、色トークン、検証ハネスのセレクタ規則をまとめる。
**スタイル・クラスを新規に書く時、色を追加する時、ハネスを書く時に読む。**

## 1. CSS の書き分け

このリポジトリには**3つの系統が同居している**。新規に書く時はまずどれかを選ぶ。

| 系統 | 使っている場所 | 新規で選ぶ条件 |
|------|---------------|---------------|
| Tailwind ユーティリティ | `EmployeeDirectory/**` `AvatarCustomizer/**` `AppHeader` `a11y/**` | **既に Tailwind で書かれたツリーの中**に部品を足す時 |
| コンポーネント隣の CSS Modules | 上記以外のほぼ全て(キャンバス・詳細パネル・編集モード・オーバーレイ等) | **既定はこれ**。迷ったらこちら |
| `styles/` 残留グローバル | 下の4ファイルのみ | 複数ツリーが横断参照するユーティリティか、色トークンの定義 |

判定は「**その親コンポーネントがどちらで書かれているか**」で決める。同じツリー内で混ぜると、
片方を直しても効かない箇所が生まれて原因追跡が難しくなる。

### CSS Modules の置き方

- ファイルは**所有コンポーネントのフォルダ直下**に置き、ファイル名は kebab-case
  (`components/TeamOverlay/team-overlay-modal.module.css`)
- クラスのキーは camelCase。`className={styles.seatCard}`
- 状態の付け外しは三項で連結する
  ```tsx
  className={`${styles.wrap}${isCompact ? ` ${styles.isCompact}` : ''}`}
  ```
- **文字列でクラス名を組み立てない**。`is-${side}` のような動的組み立てはハッシュ名と噛み合わないので、
  `Record` マップで解決する(`ScrollHint` の `SIDE_CLASS`、`SeatDirectionMarker` の `EDGE_CLASS` が実例)
- 複数のコンポーネントが同じモジュールを使う時は**モジュールを多重 import する**。クラスを複製しない
  (`TeamOverlay` 配下の20ファイルが1本のモジュールを共有している)
- 型宣言は `types/css-modules.d.ts` にある。ファイルを足しても追加作業は要らない

### `styles/` に残した4ファイルと、その理由

| ファイル | 残す理由 |
|---|---|
| `tokens.css` | 色トークンの唯一の定義場所。ハッシュ化すると `var(--color-*)` の解決元が消える |
| `globals.css` | リセットと、ツリーを横断する汎用ユーティリティ(`.sr-only` `.material-symbols-outlined` `.pixel-btn`)。Tailwind 側のツリーからも参照される |
| `icon.css` | `.icon-msr-filled` `.icon-msr-thin` を約30ファイルが横断使用する。ハッシュ化すると参照が切れる |
| `liquid-glass.css` | `.liquid-glass` `.glass-*` が同じく横断使用される |

**接頭辞の名前空間(`fac-` `sheet-` `emp-dir-` 等)はモジュール化で不要になった。**
新規のモジュールクラスに接頭辞を付けない。上の4ファイルへ**新しくクラスを足す場合に限り**、
グローバル空間での衝突を避けるため接頭辞を付ける。

### グローバルユーティリティと同じプロパティを宣言しない

`.material-symbols-outlined` と併用するモジュールクラスに `font-size` を書かない。
グローバル側が `font-size: 26px` を持っており、**詳細度は同じ(0,1,0)**。
グローバル CSS だった頃は後勝ちでグローバルが適用されていたが、モジュールの CSS チャンクは
`globals.css` より後に読まれるため、書くと勝ってしまい見た目が静かに変わる。

実際、B5 移行で `sectionIcon` など8クラスがこれに該当し、26px → 14〜22px に縮んだ
(`docs/pitfalls.md` 該当項目)。アイコンの大きさを変えるのは移行ではなく**見た目の変更**として別に扱う。

同種の衝突は `line-height` `display` `font-family` でも起きうる。グローバルユーティリティと
同時付与するクラスを書く時は、そのユーティリティが何を宣言しているかを先に読む。

## 2. 色は必ずトークン経由

CSS に色リテラル(`#rrggbb` / `rgba()`)を書かない。**`styles/tokens.css` が唯一の定義場所**。
これは CSS Modules でも残留グローバルでも同じ。

理由: リテラルで書くと `dracula` などのテーマで浮く。テーマ別ブロックで一括で切り替わるのは
トークンだけで、リテラルは切り替わらない。しかも既定テーマで開発している限り目に見えない。

- 半透明が要る時は `color-mix(in srgb, var(--color-surface) 97%, transparent)` の形にする
- テーマ非依存にしたい色(モーダルの暗幕など)も**トークンとして** `tokens.css` に置く
  (`--color-scrim`)。「テーマに依らないから直書き」は認めない
- 色を薄める/濃める計算の相手側もトークンにする(`--color-band-highlight`)

**例外**: `lib/avatar/**` `utils/team-colors.ts` のようにアバターパレット・チーム色を
**データとして**持つ TS ファイルは対象外。これは配色定義ではなくコンテンツである。

## 3. 使われなくなったクラスは消す

参照が無くなったクラスは残さない。ただし削除前に**動的組み立てを必ず確認する**。

```
`cat-${category}`   → .cat-meeting / .cat-out / .cat-vacation
```

この形は `grep .cat-meeting` では引っかからない。接頭辞(`cat-`)で検索すること。
モジュール側は `styles.` 参照なので、キー名で grep すれば呼び出し元が全部出る
(バレルを挟まないので grep が切れない)。

## 4. 検証ハネスのセレクタ

`~/dev/.seatmap-port` の Playwright スクリプトは**平文クラス名で要素を掴んではいけない**。
モジュール化されたクラスは `<ファイル>-module__<ハッシュ>__<キー>` になり、ハッシュはビルドごとに変わりうる。

優先順に使う:

1. **既にある安定フック** — `data-coach="..."` `aria-label` `aria-expanded` `role` `data-seat-id`
   `data-team-id` `data-facility`。これが使えるなら常にこれ
2. **モジュール名 + キー名の完全一致** — 生成名は `<ファイル>-module__<ハッシュ>__<キー>` なので、
   前をモジュール名で、後ろをキーの末尾で固定する

   ```js
   const k = (key) =>
     `[class*="team-overlay-modal-module__"]:is([class$="__${key}"],[class*="__${key} "])`
   ```

   **両方要る。** モジュール接頭辞を省くと `__panel` が `layout-switcher` 側の `__panel` まで拾う
   (実際に B5 で `check-minimap` がこれで落ちた)。末尾固定を省くと `__cell` が `__cellName`
   `__cellStatus` まで拾う。キーの衝突は現時点で15件あり、他モジュールの追加で増えうる
3. **タグで絞る** — それでも衝突するなら `button[class$="__official"]` のように要素名を足す

`page.evaluate()` の中で使うセレクタは Node 側の変数を参照できない。上の形は**ただの文字列**なので
そのまま埋め込める(テンプレート補間にしないこと)。

`element.classList.contains('平文クラス')` も同様に壊れる。`element.matches(k('editcard'))` に置き換える。

**セレクタが見つからない時に静かに通過する書き方をしない。** 要素不在は必ず FAIL に落とす。
新しく書いた検証は**一度わざと落として検出力を確かめてから**採用する
(`~/.claude/rules/02-verifying.md` 6.)。
