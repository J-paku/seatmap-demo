import { useDateSwipe } from './hooks/use-date-swipe'
import type { SwipeDateStageProps } from './type'

// 予定カードを左右スワイプで前日/翌日へ送る台。ジェスチャーと演出は useDateSwipe が持つ

type Props = SwipeDateStageProps

export const SwipeDateStage = ({ cardKey, onSwipePrevDay, onSwipeNextDay, children }: Props) => {
  const { stageRef, cardRef, depthRef, stampPrevRef, stampNextRef, handlers } = useDateSwipe({
    cardKey,
    onSwipePrevDay,
    onSwipeNextDay,
  })

  return (
    <div ref={stageRef} className='swipe-stage'>
      <div
        ref={depthRef}
        className='swipe-depth-card'
        aria-hidden='true'
        style={{ opacity: 0, transform: 'scale(0.9)' }}
      />
      <div ref={stampPrevRef} className='swipe-stamp swipe-stamp-prev' aria-hidden='true' style={{ opacity: 0 }}>
        ‹前日
      </div>
      <div ref={stampNextRef} className='swipe-stamp swipe-stamp-next' aria-hidden='true' style={{ opacity: 0 }}>
        翌日›
      </div>
      <div ref={cardRef} className='swipe-front-card' {...handlers}>
        {children}
      </div>
    </div>
  )
}
