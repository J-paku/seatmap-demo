// 横スクロールヒント。コンポーネント自体は共用で、onNudge を渡すか否かでボタン / 装飾が切り替わる

type Props = {
  side: 'left' | 'right'
  onNudge?: () => void
  // スクロール端に達した状態。true なら is-faded を付与しフェードアウト(アンマウントはしない)
  faded?: boolean
}

export const ScrollHint = ({ side, onNudge, faded = false }: Props) => {
  const icon = side === 'left' ? 'chevron_left' : 'chevron_right'
  const fadedClass = faded ? ' is-faded' : ''

  // onNudge 無し = 表示のみ。ポインタを取らず読み上げからも外す
  if (!onNudge) {
    return (
      <span className={`team-ovl-hint is-${side}${fadedClass}`} aria-hidden='true'>
        <span className='material-symbols-outlined'>{icon}</span>
      </span>
    )
  }

  return (
    <button
      type='button'
      className={`team-ovl-hint is-${side} is-button${fadedClass}`}
      aria-label={side === 'left' ? '左の列へスクロール' : '右の列へスクロール'}
      onClick={onNudge}
      disabled={faded}
      aria-hidden={faded || undefined}
    >
      <span className='material-symbols-outlined'>{icon}</span>
    </button>
  )
}
