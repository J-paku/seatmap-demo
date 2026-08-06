import { triggerHaptic } from '@/lib/haptic'

// カード最下段のアクション行。電話帳に登録(常時) ‖ 座席へ移動(移動できる時だけ)

type Props = {
  employeeName: string
  onRegisterContact: () => void
  onGoToSeat?: () => void
  showSeatUnsetNotice?: boolean
}

// デモでは電話帳ボタンを常に出すため、バーが空になる分岐は起きない
export const ActionBar = ({ employeeName, onRegisterContact, onGoToSeat, showSeatUnsetNotice }: Props) => (
  <div className='profile-action-bar'>
    <button
      type='button'
      className='profile-action-btn profile-action-secondary'
      aria-label='電話帳に登録'
      onClick={() => {
        triggerHaptic('light')
        onRegisterContact()
      }}
    >
      <span className='material-symbols-outlined profile-action-icon' aria-hidden='true'>
        contacts
      </span>
      電話帳に登録
    </button>

    {onGoToSeat && (
      <button
        type='button'
        className='profile-action-btn profile-action-primary'
        aria-label={`${employeeName}の座席へ移動`}
        onClick={() => {
          triggerHaptic('light')
          onGoToSeat()
        }}
      >
        座席へ移動
        <span className='material-symbols-outlined profile-action-icon' aria-hidden='true'>
          chevron_right
        </span>
      </button>
    )}

    {!onGoToSeat && showSeatUnsetNotice && (
      <div className='profile-action-unset' role='status'>
        座席未設定
      </div>
    )}
  </div>
)
