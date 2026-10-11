// 全モーダル共通のシートハンドル。タップで閉じ、下スワイプの起点にもなる。
// data-drag-handle は useSwipeToDismiss がスクロールゲート免除の起点判定に使う。
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
    data-drag-handle='true'
    style={heightPx === undefined ? undefined : { height: heightPx }}
    aria-label='閉じる'
    onClick={onClose}
  >
    <span className={barClassName} data-drag-handle='true' />
  </button>
)
