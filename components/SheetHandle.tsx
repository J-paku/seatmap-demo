// 全モーダル共通のシートハンドル。タップで閉じ、下スワイプの起点にもなる。
// data-handle は useSwipeDismiss が「スクロールゲートを無視してよい起点か」の判定に使う。
// 見た目(高さ・余白・表示ブレークポイント)は各シートのクラスが持ち、ここは挙動だけを揃える

import styles from './sheet-handle.module.css'

type Props = {
  stripClassName: string
  barClassName: string
  heightPx?: number
  onClose: () => void
}

export const SheetHandle = ({ stripClassName, barClassName, heightPx, onClose }: Props) => (
  <button
    type='button'
    className={`${styles.hit} ${stripClassName}`}
    data-handle='true'
    style={heightPx === undefined ? undefined : { height: heightPx }}
    aria-label='閉じる'
    onClick={onClose}
  >
    <span className={barClassName} data-handle='true' />
  </button>
)
