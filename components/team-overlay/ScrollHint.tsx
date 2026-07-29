// 横スクロールヒント。コンポーネント自体は共用で、onNudge を渡すか否かでボタン / 装飾が切り替わる

type Props = {
  side: 'left' | 'right'
  onNudge?: () => void
}

export const ScrollHint = ({ side, onNudge }: Props) => {
  const icon = side === 'left' ? 'chevron_left' : 'chevron_right'

  // onNudge 無し = 表示のみ。ポインタを取らず読み上げからも外す
  if (!onNudge) {
    return (
      <span className={`team-ovl-hint is-${side}`} aria-hidden='true'>
        <span className='material-symbols-outlined'>{icon}</span>
      </span>
    )
  }

  return (
    <button
      type='button'
      className={`team-ovl-hint is-${side} is-button`}
      aria-label={side === 'left' ? '左の列へスクロール' : '右の列へスクロール'}
      onClick={onNudge}
    >
      <span className='material-symbols-outlined'>{icon}</span>
    </button>
  )
}
