# styling.md — CSS・色の書き分け規則(seatmap-demo 固有)

Tailwind と `styles/*.css` の使い分け、クラス命名、色トークンの規則をまとめる。
**スタイル・クラスを新規に書く時、または色を追加する時に読む。**

## 1. CSS の書き分け

このリポジトリには**2つのスタイル系統が同居している**。新規に書く時はまずどちらかを選ぶ。

| 系統 | 使っている場所 | 新規で選ぶ条件 |
|------|---------------|---------------|
| Tailwind ユーティリティ | `EmployeeDirectory/**` `AvatarCustomizer/**` `AppHeader` `a11y/**` | **既に Tailwind で書かれたツリーの中**に部品を足す時 |
| `styles/*.css` のグローバルクラス | それ以外の全て(キャンバス・詳細パネル・編集モード等) | 上記以外。迷ったらこちら |

判定は「**その親コンポーネントがどちらで書かれているか**」の一点で決める。同じツリー内で
混ぜると、片方を直しても効かない箇所が生まれて原因追跡が難しくなる。

### グローバルクラスの置き場と命名

- 置き場は**画面・機能ごとに1ファイル**。`styles/globals.css` の `@import` に追記する
  (CSS バレル禁止・Turbopack 対策のため直接列挙する)
- **`@import` の並び順はカスケード順そのもの**。同じ詳細度の規則は後勝ちなので、並びを変えると
  見た目が静かに変わる。並べ替えたら必ずビルド成果物のCSSを分割前と突き合わせる
- クラス名は**機能ごとの短い接頭辞**で名前空間を切る(`fac-` 施設詳細 / `schedule-` 予定欄 /
  `sheet-` シェル / `emp-dir-` サイドバー)。接頭辞なしの汎用名は衝突するので作らない
- 状態は `.is-` 接頭辞の修飾クラス(`.fac-row.is-now`)。既存規則と競合する時は
  **同じか高い詳細度**にする(`.zoom-controls button.zoom-controls-reset` が実例)

### 色は必ずトークン経由

`styles/**` に色リテラル(`#rrggbb` / `rgba()`)を書かない。**`styles/tokens.css` が唯一の定義場所**。

理由: リテラルで書くと `dracula` / `kuroxxx` テーマで浮く。実際 `.fac-hover` のアイコンが
`#2563eb` 固定だった等の不整合が過去に発生している。

- 半透明が要る時は `color-mix(in srgb, var(--color-surface) 97%, transparent)` の形にする
- テーマ非依存にしたい色(モーダルの暗幕など)も**トークンとして** `tokens.css` に置く
  (`--color-scrim`)。「テーマに依らないから直書き」は認めない
- 色を薄める/濃める計算の相手側もトークンにする(`--color-band-highlight`)

**例外**: `lib/avatar/**` `utils/team-colors.ts` のようにアバターパレット・チーム色を
**データとして**持つ TS ファイルは対象外。これは配色定義ではなくコンテンツである。

### 使われなくなったクラスは消す

参照が無くなったクラスは残さない。ただし削除前に**動的組み立てを必ず確認する**。

```
`sheet-${variant}`  → .sheet-employee / .sheet-facility / .sheet-schedule
`cat-${category}`   → .cat-meeting / .cat-out / .cat-vacation
```

この形は `grep .sheet-employee` では引っかからない。接頭辞(`sheet-`)で検索すること。
