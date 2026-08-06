import type { ContactField } from '../type'

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
  <div className='contact-row'>
    <span className='material-symbols-outlined contact-icon'>{icon}</span>
    <span className='contact-value'>{displayValue}</span>
    <button
      type='button'
      className={`contact-copy-btn${isCopied ? ' is-copied' : ''}`}
      aria-label={copyLabel}
      onClick={() => onCopy(field, copyValue)}
    >
      <span className='material-symbols-outlined' style={{ fontSize: 16 }}>
        {isCopied ? 'check' : 'content_copy'}
      </span>
    </button>
    {isCopied && <span className='contact-copy-bubble'>コピーしました</span>}
  </div>
)
