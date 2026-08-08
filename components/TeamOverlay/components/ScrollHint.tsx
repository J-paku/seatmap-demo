import styles from '../team-overlay-modal.module.css'

// 横スクロールヒント。コンポーネント自体は共用で、onNudge を渡すか否かでボタン / 装飾が切り替わる

const SIDE_CLASS: Record<'left' | 'right', string> = {
  left: styles.isLeft,
  right: styles.isRight,
}

type Props = {
  side: 'left' | 'right'
  onNudge?: () => void
  // スクロール端に達した状態。true なら isFaded を付与しフェードアウト(アンマウントはしない)
  faded?: boolean
}

export const ScrollHint = ({ side, onNudge, faded = false }: Props) => {
  const icon = side === 'left' ? 'chevron_left' : 'chevron_right'
  const fadedClass = faded ? ` ${styles.isFaded}` : ''

  // onNudge 無し = 表示のみ。ポインタを取らず読み上げからも外す
  if (!onNudge) {
    return (
      <span className={`${styles.hint} ${SIDE_CLASS[side]}${fadedClass}`} aria-hidden='true'>
        <span className='material-symbols-outlined'>{icon}</span>
      </span>
    )
  }

  return (
    <button
      type='button'
      className={`${styles.hint} ${SIDE_CLASS[side]} ${styles.isButton}${fadedClass}`}
      aria-label={side === 'left' ? '左の列へスクロール' : '右の列へスクロール'}
      onClick={onNudge}
      disabled={faded}
      aria-hidden={faded || undefined}
    >
      <span className='material-symbols-outlined'>{icon}</span>
    </button>
  )
}
