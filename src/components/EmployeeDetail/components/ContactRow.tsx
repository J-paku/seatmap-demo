import type { ContactField } from '../type'
import styles from '../employee-detail.module.css'

// 連絡先1行。値は素のテキストで、右端に 44px のコピー領域を置く
// 電話番号は下4桁を伏せ字にしたモックなので tel: リンクにはしない(発信できない番号のため)

type Props = {
  field: ContactField
  icon: string
  copyLabel: string
  displayValue: string
  copyValue: string
  isCopied: boolean
  onCopy: (field: ContactField, value: string) => void
}

export const ContactRow = ({ field, icon, copyLabel, displayValue, copyValue, isCopied, onCopy }: Props) => (
  <div className={styles.contactRow}>
    <span className={`material-symbols-outlined ${styles.contactIcon}`}>{icon}</span>
    <span className={styles.contactValue}>{displayValue}</span>
    <button
      type='button'
      className={`${styles.contactCopyBtn}${isCopied ? ` ${styles.isCopied}` : ''}`}
      aria-label={copyLabel}
      onClick={() => onCopy(field, copyValue)}
    >
      <span className='material-symbols-outlined' style={{ fontSize: 16 }}>
        {isCopied ? 'check' : 'content_copy'}
      </span>
    </button>
    {isCopied && <span className={styles.contactCopyBubble}>コピーしました</span>}
  </div>
)
