import { TOUR_FLOWS } from './utils/tour-steps'
import type { useCoachMarkTour } from './hooks/use-coach-mark-tour'
import styles from './coach-mark.module.css'

// スポットライト式コーチマーク。対象の矩形をくり抜いて周囲を暗くする。
// くり抜きは巨大な box-shadow で表現するので、対象の上にだけ何も被らない

// カードを対象の下に出す余裕。足りなければ上へ回す
const CARD_GAP_PX = 14
const CARD_MIN_SPACE_PX = 180

type Props = {
  tour: ReturnType<typeof useCoachMarkTour>
}

export const CoachMarkTour = ({ tour }: Props) => {
  if (tour.isBranching) {
    return (
      <div className={styles.layer} role='dialog' aria-modal='true' aria-label='操作ガイド'>
        <div className={styles.scrim} />
        <div className={`${styles.card} ${styles.isCentered}`}>
          <p className={styles.question}>何を動かしますか？</p>
          <div className={styles.choices}>
            {TOUR_FLOWS.map((option) => (
              <button
                key={option.flow}
                type='button'
                className={styles.choice}
                onClick={() => tour.chooseFlow(option.flow)}
              >
                <span className={styles.choiceLabel}>{option.label}</span>
                <span className={styles.choiceDesc}>{option.description}</span>
              </button>
            ))}
          </div>
          <button type='button' className={`pixel-btn ${styles.skip}`} onClick={tour.close}>
            スキップ
          </button>
        </div>
      </div>
    )
  }

  if (!tour.step) return null

  const rect = tour.targetRect

  if (!rect) {
    // 対象の実測がまだ済んでいない間はスポットライトを出さず、全面ダイムだけ残す
    return (
      <div className={styles.layer} role='dialog' aria-modal='true' aria-label='操作ガイド'>
        <div className={styles.scrim} />
      </div>
    )
  }

  const below = rect.bottom + CARD_GAP_PX
  const flipped = window.innerHeight - below < CARD_MIN_SPACE_PX
  const isLast = tour.stepIndex === tour.stepCount - 1

  return (
    <div className={styles.layer} role='dialog' aria-modal='true' aria-label='操作ガイド'>
      {/* くり抜き本体。周囲を暗くするのは box-shadow なので対象の上には何も乗らない */}
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
      >
        <p className={styles.text}>{tour.step.text}</p>
        <div className={styles.actions}>
          <span className={styles.progress}>
            {tour.stepIndex + 1} / {tour.stepCount}
          </span>
          <button type='button' className={`pixel-btn ${styles.skip}`} onClick={tour.close}>
            とじる
          </button>
          <button type='button' className='pixel-btn coach-next' onClick={tour.next}>
            {isLast ? '完了' : '次へ'}
          </button>
        </div>
      </div>
    </div>
  )
}
