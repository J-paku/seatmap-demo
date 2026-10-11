import { useDateSwipe } from './hooks/use-date-swipe'
import type { SwipeDateStageProps } from './type'
import styles from '../date-navigator.module.css'

// 予定カードを左右スワイプで前日/翌日へ送る台。ジェスチャーと演出は useDateSwipe が持つ

type Props = SwipeDateStageProps

export const SwipeDateStage = ({ cardKey, onSwipePrevDay, onSwipeNextDay, fill, children }: Props) => {
  const { stageRef, cardRef, depthRef, stampPrevRef, stampNextRef, handlers } = useDateSwipe({
    cardKey,
    onSwipePrevDay,
    onSwipeNextDay,
  })

  return (
    <div ref={stageRef} className={`${styles.swipeStage}${fill ? ` ${styles.swipeStageFill}` : ''}`}>
      <div
        ref={depthRef}
        className={styles.swipeDepthCard}
        aria-hidden='true'
        style={{ opacity: 0, transform: 'scale(0.9)' }}
      />
      <div ref={stampPrevRef} className={`${styles.swipeStamp} ${styles.swipeStampPrev}`} aria-hidden='true' style={{ opacity: 0 }}>
        ‹前日
      </div>
      <div ref={stampNextRef} className={`${styles.swipeStamp} ${styles.swipeStampNext}`} aria-hidden='true' style={{ opacity: 0 }}>
        翌日›
      </div>
      <div ref={cardRef} className={`${styles.swipeFrontCard}${fill ? ` ${styles.swipeFrontCardFill}` : ''}`} {...handlers}>
        {children}
      </div>
    </div>
  )
}
