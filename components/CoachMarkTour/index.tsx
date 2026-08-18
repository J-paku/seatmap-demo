import type { CoachMarkTourState } from './hooks/use-coach-mark-tour'
import { triggerHaptic } from '@/utils/haptic'
import { getCardPlacementStyle } from './utils/card-placement'
import styles from './coach-mark.module.css'

// スポットライト式コーチマーク。対象の矩形をくり抜いて周囲を暗くする。
// くり抜きは巨大な box-shadow で表現するので、対象の上にだけ何も被らない

// このカードの操作は全て同じ触覚フィードバックを伴うので、ハンドラをここで包む
const withHaptic = (action: () => void) => () => {
  triggerHaptic('light')
  action()
}

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
      <div className={styles.layer} role='dialog' aria-modal='true' aria-label='操作ガイド' data-coach-tour='true'>
        <div className={styles.scrim} />
        <div className={`${styles.card} ${styles.isCentered}`}>
          <p className={styles.question}>{branch.title}</p>
          <div className={styles.choices}>
            {branch.options.map((option, index) => (
              <button
                key={option.key}
                type='button'
                className={styles.choice}
                onClick={withHaptic(() => tour.chooseBranch(index))}
              >
                <span className={styles.choiceLabel}>{option.label}</span>
                <span className={styles.choiceDesc}>{option.description}</span>
              </button>
            ))}
          </div>
          <div className={styles.subActions}>
            <button type='button' className={styles.link} onClick={withHaptic(tour.close)}>
              スキップ
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!tour.step) return null

  const rect = tour.targetRect
  const isLast = tour.stepIndex === tour.stepCount - 1
  const showBack = tour.stepIndex > 0
  const handleFinishOrNext = withHaptic(isLast ? tour.close : tour.next)

  return (
    // レイヤー全面のクリックは次へ(最終ステップは完了)と同じ扱いにする。
    // カード内クリックは stopPropagation でここへ伝播させず、ボタン押下と二重進行しないようにする
    <div
      className={styles.layer}
      role='dialog'
      aria-modal='true'
      aria-label='操作ガイド'
      data-coach-tour='true'
      onClick={handleFinishOrNext}
    >
      {rect ? (
        // くり抜き本体。周囲を暗くするのは box-shadow なので対象の上には何も乗らない。
        // この矩形自体は実体を持つので、穴の内側をクリックしても対象要素へは通らず
        // ここが受け止めて(.layer へ伝播して)次へ進む
        <div
          className={styles.spotlight}
          style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      ) : (
        // 対象が無いステップはスポットライトを出さず、全面ダイム+中央カードにする
        <div className={styles.scrim} />
      )}
      <div
        className={rect ? styles.card : `${styles.card} ${styles.isCentered}`}
        style={rect ? getCardPlacementStyle(rect) : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        {/* ドットは装飾なので支援技術からは隠し、段数は .sr-only のテキストで読ませる */}
        <span className='sr-only'>{`${tour.stepIndex + 1} / ${tour.stepCount}`}</span>
        <div className={styles.progress} aria-hidden='true'>
          {Array.from({ length: tour.stepCount }, (_, index) => (
            <span
              key={index}
              className={`${styles.dot} ${index === tour.stepIndex ? styles.dotActive : ''}`}
            />
          ))}
        </div>
        <p className={styles.text}>{tour.step.text}</p>
        <div className={styles.actions}>
          <button
            type='button'
            className={`pixel-btn coach-next ${styles.next}`}
            onClick={handleFinishOrNext}
          >
            {isLast ? '完了' : '次へ'}
          </button>
          <div className={styles.subActions}>
            {showBack && (
              <>
                <button type='button' className={styles.link} onClick={withHaptic(tour.prev)}>
                  戻る
                </button>
                <span className={styles.linkDivider} aria-hidden='true'>
                  ·
                </span>
              </>
            )}
            <button type='button' className={styles.link} onClick={withHaptic(tour.close)}>
              とじる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
