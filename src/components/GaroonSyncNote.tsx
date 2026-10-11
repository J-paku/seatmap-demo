import type { CSSProperties } from 'react'
import styles from './garoon-sync-note.module.css'

// 予定データの出所が Garoon であることを示す注記。スケジュール更新ボタンの近くに置く
// 3画面(社員詳細・施設詳細・チームオーバーレイ)で文言を1箇所にまとめて再利用する。
// 装飾は持たず、呼び出し側の既存キャプション(.scheduleUpdatedAt 等)と同じ薄いトーンに揃える

const GAROON_SYNC_NOTE_TEXT = '※ 予定データはGaroonと同期'

type Props = {
  // 呼び出し先ごとの余白・整列だけを上書きするための追加クラス
  className?: string
  style?: CSSProperties
}

// 文言中の「Garoon」だけを強調表示するための分割。GAROON_SYNC_NOTE_TEXT 自体は不変のまま、
// 描画時だけ prefix / "Garoon" / suffix に割る
const GAROON_BRAND_WORD = 'Garoon'
const [garoonNotePrefix, garoonNoteSuffix] = GAROON_SYNC_NOTE_TEXT.split(GAROON_BRAND_WORD)

export const GaroonSyncNote = ({ className, style }: Props) => (
  <p className={className ? `${styles.garoonSyncNote} ${className}` : styles.garoonSyncNote} style={style}>
    {garoonNotePrefix}
    <span className={styles.brand}>{GAROON_BRAND_WORD}</span>
    {garoonNoteSuffix}
  </p>
)
