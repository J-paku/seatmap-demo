import type { CoachMarkTourState } from './hooks/use-coach-mark-tour'
import { triggerHaptic } from '@/utils/haptic'
import styles from './coach-mark.module.css'

// スポットライト式コーチマーク。対象の矩形をくり抜いて周囲を暗くする。
// くり抜きは巨大な box-shadow で表現するので、対象の上にだけ何も被らない

// カードを対象の下に出す余裕。足りなければ上へ回す
const CARD_GAP_PX = 14
const CARD_MIN_SPACE_PX = 180

type Props = {
  tour: CoachMarkTourState
}

export const CoachMarkTour = ({ tour }: Props) => {
  if (tour.isBranching && tour.branch) {
    const branch = tour.branch
    // 分岐カード表示中はレイヤークリックで進行しない(選べる前に進む先が無いため)。
    // onClick を付けないだけで、.layer の pointer-events: auto がクリックを受け止めて
    // 背後の要素へ通さない(ブロックのみ)
    return (
      <div className={styles.layer} role='dialog' aria-modal='true' aria-label='操作ガイド'>
        <div className={styles.scrim} />
        <div className={`${styles.card} ${styles.isCentered}`}>
          <p className={styles.question}>{branch.title}</p>
          <div className={styles.choices}>
            {branch.options.map((option, index) => (
              <button
                key={option.key}
                type='button'
                className={styles.choice}
                onClick={() => {
                  triggerHaptic('light')
                  tour.chooseBranch(index)
                }}
              >
                <span className={styles.choiceLabel}>{option.label}</span>
                <span className={styles.choiceDesc}>{option.description}</span>
              </button>
            ))}
          </div>
          <button
            type='button'
            className={`pixel-btn ${styles.skip}`}
            onClick={() => {
              triggerHaptic('light')
              tour.close()
            }}
          >
            スキップ
          </button>
        </div>
      </div>
    )
  }

  if (!tour.step) return null

  const rect = tour.targetRect
  const isLast = tour.stepIndex === tour.stepCount - 1
  const showBack = tour.stepIndex > 0

  const handleFinishOrNext = () => {
    triggerHaptic('light')
    if (isLast) {
      tour.close()
    } else {
      tour.next()
    }
  }

  const actions = (
    <div className={styles.actions}>
      <span className={styles.progress}>
        {tour.stepIndex + 1} / {tour.stepCount}
      </span>
      {showBack && (
        <button
          type='button'
          className={`pixel-btn ${styles.back}`}
          onClick={() => {
            triggerHaptic('light')
            tour.prev()
          }}
        >
          戻る
        </button>
      )}
      <button
        type='button'
        className={`pixel-btn ${styles.skip}`}
        onClick={() => {
          triggerHaptic('light')
          tour.close()
        }}
      >
        とじる
      </button>
      <button type='button' className='pixel-btn coach-next' onClick={handleFinishOrNext}>
        {isLast ? '完了' : '次へ'}
      </button>
    </div>
  )

  if (!rect) {
    // 対象が無い(センターカード)ステップ。スポットライトを出さず全面ダイム+中央カードのみ。
    // レイヤー全面のクリックは次へ(最終ステップは完了)と同じ扱いにする。
    // カード内クリックは stopPropagation でここへ伝播させず、ボタン押下と二重進行しないようにする
    return (
      <div
        className={styles.layer}
        role='dialog'
        aria-modal='true'
        aria-label='操作ガイド'
        onClick={handleFinishOrNext}
      >
        <div className={styles.scrim} />
        <div
          className={`${styles.card} ${styles.isCentered}`}
          onClick={(event) => event.stopPropagation()}
        >
          <p className={styles.text}>{tour.step.text}</p>
          {actions}
        </div>
      </div>
    )
  }

  const below = rect.bottom + CARD_GAP_PX
  const flipped = window.innerHeight - below < CARD_MIN_SPACE_PX

  return (
    <div
      className={styles.layer}
      role='dialog'
      aria-modal='true'
      aria-label='操作ガイド'
      onClick={handleFinishOrNext}
    >
      {/* くり抜き本体。周囲を暗くするのは box-shadow なので対象の上には何も乗らない。
          この矩形自体は実体を持つので、穴の内側をクリックしても対象要素へは通らず
          ここが受け止めて(.layer へ伝播して)次へ進む */}
      <div
        className={styles.spotlight}
        style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
      />
      <div
        className={styles.card}
        style={{
          left: Math.min(Math.max(rect.left + rect.width / 2, 180), window.innerWidth - 180),
          top: flipped ? rect.top - CARD_GAP_PX : below,
          transform: flipped ? 'translate(-50%, -100%)' : 'translateX(-50%)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <p className={styles.text}>{tour.step.text}</p>
        {actions}
      </div>
    </div>
  )
}
