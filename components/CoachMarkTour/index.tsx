import { TOUR_FLOWS } from './utils/tour-steps'
import type { useCoachMarkTour } from './hooks/use-coach-mark-tour'

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
      <div className='coach-layer' role='dialog' aria-modal='true' aria-label='操作ガイド'>
        <div className='coach-scrim' />
        <div className='coach-card is-centered'>
          <p className='coach-question'>何を動かしますか？</p>
          <div className='coach-choices'>
            {TOUR_FLOWS.map((option) => (
              <button
                key={option.flow}
                type='button'
                className='coach-choice'
                onClick={() => tour.chooseFlow(option.flow)}
              >
                <span className='coach-choice-label'>{option.label}</span>
                <span className='coach-choice-desc'>{option.description}</span>
              </button>
            ))}
          </div>
          <button type='button' className='pixel-btn coach-skip' onClick={tour.close}>
            スキップ
          </button>
        </div>
      </div>
    )
  }

  if (!tour.step || !tour.targetRect) return null

  const rect = tour.targetRect
  const below = rect.bottom + CARD_GAP_PX
  const flipped = window.innerHeight - below < CARD_MIN_SPACE_PX
  const isLast = tour.stepIndex === tour.stepCount - 1

  return (
    <div className='coach-layer' role='dialog' aria-modal='true' aria-label='操作ガイド'>
      {/* くり抜き本体。周囲を暗くするのは box-shadow なので対象の上には何も乗らない */}
      <div
        className='coach-spotlight'
        style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
      />
      <div
        className='coach-card'
        style={{
          left: Math.min(Math.max(rect.left + rect.width / 2, 180), window.innerWidth - 180),
          top: flipped ? rect.top - CARD_GAP_PX : below,
          transform: flipped ? 'translate(-50%, -100%)' : 'translateX(-50%)',
        }}
      >
        <p className='coach-text'>{tour.step.text}</p>
        <div className='coach-actions'>
          <span className='coach-progress'>
            {tour.stepIndex + 1} / {tour.stepCount}
          </span>
          <button type='button' className='pixel-btn coach-skip' onClick={tour.close}>
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
