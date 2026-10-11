import { describe, it, expect } from 'vitest'
import {
  COMMIT_DISTANCE,
  FLICK_SPEED,
  SLOP,
  SNAP_MS,
  applyEnterSettle,
  applyEnterStart,
  applyExitStyles,
  applyFollowStyles,
} from './swipe-motion'
import type { SwipeStageRefs } from '../type'

type Part = 'card' | 'depth' | 'stampPrev' | 'stampNext'

// 書き込まれた style をそのまま読める偽の要素を組む。missing に挙げた要素は ref を null にする
const createStage = (missing: readonly Part[] = []) => {
  const emptyStyle = () => ({}) as CSSStyleDeclaration
  const styles: Record<Part, CSSStyleDeclaration> = {
    card: emptyStyle(),
    depth: emptyStyle(),
    stampPrev: emptyStyle(),
    stampNext: emptyStyle(),
  }
  const refOf = (part: Part) => ({
    current: missing.includes(part) ? null : ({ style: styles[part] } as HTMLDivElement),
  })
  const refs: SwipeStageRefs = {
    stageRef: { current: null },
    cardRef: refOf('card'),
    depthRef: refOf('depth'),
    stampPrevRef: refOf('stampPrev'),
    stampNextRef: refOf('stampNext'),
  }
  return { refs, styles }
}

// translateX と rotate の数値を取り出す(translateX の px は 0 のとき省かれうる)
const cardMotionOf = (transform: string) => {
  const match = /^translateX\(([-\d.e]+)(?:px)?\) rotate\(([-\d.e]+)deg\)$/.exec(transform)
  return { x: Number(match?.[1]), tilt: Number(match?.[2]) }
}

const scaleOf = (transform: string) => Number(/^scale\(([-\d.e]+)\)$/.exec(transform)?.[1])

// スナップの補間は SNAP_MS かけて cubic-bezier で動かす
const EASE = String.raw`cubic-bezier\([^)]+\)`
const SNAP_TRANSFORM = new RegExp(`^transform ${SNAP_MS}ms ${EASE}$`)
const SNAP_TRANSFORM_OPACITY = new RegExp(
  `^transform ${SNAP_MS}ms ${EASE}, opacity ${SNAP_MS}ms ${EASE}$`
)

describe('しきい値', () => {
  it('方向を決める遊びは確定距離より短く、速さと時間は正の値', () => {
    expect(SLOP).toBeLessThan(COMMIT_DISTANCE)
    expect(FLICK_SPEED).toBeGreaterThan(0)
    expect(SNAP_MS).toBeGreaterThan(0)
  })
})

describe('applyFollowStyles', () => {
  it('抵抗の手前までは指どおりに動かし、傾き・奥行き・前日スタンプを合わせる', () => {
    const { refs, styles } = createStage()
    applyFollowStyles(refs, 56, false)

    expect(styles.card.transition).toBe('none')
    expect(styles.card.transformOrigin).toBe('center bottom')
    const card = cardMotionOf(styles.card.transform)
    expect(card.x).toBeCloseTo(56)
    expect(card.tilt).toBeCloseTo(4)

    expect(styles.depth.transition).toBe('none')
    expect(scaleOf(styles.depth.transform)).toBeCloseTo(0.95)
    expect(Number(styles.depth.opacity)).toBeCloseTo(0.5)

    expect(styles.stampPrev.transition).toBe('none')
    expect(Number(styles.stampPrev.opacity)).toBeCloseTo(0.5)
    expect(scaleOf(styles.stampPrev.transform)).toBeCloseTo(0.925)

    expect(styles.stampNext.transition).toBe('none')
    expect(Number(styles.stampNext.opacity)).toBe(0)
    expect(scaleOf(styles.stampNext.transform)).toBeCloseTo(0.85)
  })

  it('左へ動かすと向きと傾きが反転し、翌日スタンプだけが出る', () => {
    const { refs, styles } = createStage()
    applyFollowStyles(refs, -56, false)

    const card = cardMotionOf(styles.card.transform)
    expect(card.x).toBeCloseTo(-56)
    expect(card.tilt).toBeCloseTo(-4)
    expect(Number(styles.depth.opacity)).toBeCloseTo(0.5)

    expect(Number(styles.stampNext.opacity)).toBeCloseTo(0.5)
    expect(scaleOf(styles.stampNext.transform)).toBeCloseTo(0.925)
    expect(Number(styles.stampPrev.opacity)).toBe(0)
    expect(scaleOf(styles.stampPrev.transform)).toBeCloseTo(0.85)
  })

  it('抵抗の始まる距離を超えた分は縮めて動かし、進み具合は1で止まる', () => {
    const { refs, styles } = createStage()
    applyFollowStyles(refs, 212, false)

    const card = cardMotionOf(styles.card.transform)
    expect(card.x).toBeCloseTo(127)
    expect(card.tilt).toBeCloseTo(9.071)
    expect(scaleOf(styles.depth.transform)).toBeCloseTo(1)
    expect(Number(styles.depth.opacity)).toBeCloseTo(1)
    expect(Number(styles.stampPrev.opacity)).toBeCloseTo(1)
    expect(scaleOf(styles.stampPrev.transform)).toBeCloseTo(1)
  })

  it('左へ大きく動かしたときも同じだけ縮める', () => {
    const { refs, styles } = createStage()
    applyFollowStyles(refs, -212, false)

    const card = cardMotionOf(styles.card.transform)
    expect(card.x).toBeCloseTo(-127)
    expect(card.tilt).toBeCloseTo(-9.071)
    expect(Number(styles.stampNext.opacity)).toBeCloseTo(1)
    expect(Number(styles.stampPrev.opacity)).toBe(0)
  })

  it('動いていないときは中央で傾かず、奥行きもスタンプも消えている', () => {
    const { refs, styles } = createStage()
    applyFollowStyles(refs, 0, false)

    const card = cardMotionOf(styles.card.transform)
    expect(card.x).toBe(0)
    expect(card.tilt).toBe(0)
    expect(scaleOf(styles.depth.transform)).toBeCloseTo(0.9)
    expect(Number(styles.depth.opacity)).toBe(0)
    for (const stamp of [styles.stampPrev, styles.stampNext]) {
      expect(Number(stamp.opacity)).toBe(0)
      expect(scaleOf(stamp.transform)).toBeCloseTo(0.85)
    }
  })

  it('補間ありでは、カードは transform を、奥行きとスタンプは transform と opacity を補間する', () => {
    const { refs, styles } = createStage()
    applyFollowStyles(refs, 56, true)

    expect(styles.card.transition).toMatch(SNAP_TRANSFORM)
    expect(styles.depth.transition).toMatch(SNAP_TRANSFORM_OPACITY)
    expect(styles.stampPrev.transition).toMatch(SNAP_TRANSFORM_OPACITY)
    expect(styles.stampNext.transition).toMatch(SNAP_TRANSFORM_OPACITY)
  })

  it('カードが無いときは何も書き換えない', () => {
    const { refs, styles } = createStage(['card'])
    applyFollowStyles(refs, 56, false)

    expect(styles).toEqual({ card: {}, depth: {}, stampPrev: {}, stampNext: {} })
  })

  it('奥行きとスタンプが無くても、カードだけは動かす', () => {
    const { refs, styles } = createStage(['depth', 'stampPrev', 'stampNext'])
    applyFollowStyles(refs, 56, false)

    expect(cardMotionOf(styles.card.transform).x).toBeCloseTo(56)
    expect(styles.depth).toEqual({})
  })
})

describe('applyExitStyles', () => {
  it('前日(prev)はステージ幅だけ右へ送り、右に傾けて消す', () => {
    const { refs, styles } = createStage()
    applyExitStyles(refs, 'prev', 300)

    expect(styles.card.transition).toMatch(SNAP_TRANSFORM_OPACITY)
    const card = cardMotionOf(styles.card.transform)
    expect(card.x).toBe(300)
    expect(card.tilt).toBeGreaterThan(0)
    expect(styles.card.opacity).toBe('0')

    expect(styles.depth.transition).toMatch(SNAP_TRANSFORM_OPACITY)
    expect(scaleOf(styles.depth.transform)).toBe(1)
    expect(styles.depth.opacity).toBe('0')
  })

  it('翌日(next)はステージ幅だけ左へ送り、同じ角度だけ左に傾ける', () => {
    const prev = createStage()
    applyExitStyles(prev.refs, 'prev', 300)
    const next = createStage()
    applyExitStyles(next.refs, 'next', 300)

    const card = cardMotionOf(next.styles.card.transform)
    expect(card.x).toBe(-300)
    expect(card.tilt).toBe(-cardMotionOf(prev.styles.card.transform).tilt)
  })

  it('カードが無くても奥行きは送り出す', () => {
    const { refs, styles } = createStage(['card'])
    applyExitStyles(refs, 'prev', 300)

    expect(styles.card).toEqual({})
    expect(styles.depth.opacity).toBe('0')
  })

  it('奥行きが無くてもカードは送り出す', () => {
    const { refs, styles } = createStage(['depth'])
    applyExitStyles(refs, 'next', 300)

    expect(styles.depth).toEqual({})
    expect(styles.card.opacity).toBe('0')
  })
})

describe('applyEnterStart', () => {
  it('前日(prev)へ移ったときは左の画面外から、透明な状態で入る', () => {
    const { refs, styles } = createStage()
    applyEnterStart(refs, 'prev', 300)

    expect(styles.card.transition).toBe('none')
    expect(cardMotionOf(styles.card.transform)).toEqual({ x: -300, tilt: 0 })
    expect(styles.card.opacity).toBe('0')
  })

  it('翌日(next)へ移ったときは右の画面外から入る', () => {
    const { refs, styles } = createStage()
    applyEnterStart(refs, 'next', 300)

    expect(cardMotionOf(styles.card.transform)).toEqual({ x: 300, tilt: 0 })
    expect(styles.card.opacity).toBe('0')
  })

  it('方向が無い(ボタン・カレンダー由来)ときは動かさず、見えたまま始める', () => {
    const { refs, styles } = createStage()
    applyEnterStart(refs, null, 300)

    expect(cardMotionOf(styles.card.transform)).toEqual({ x: 0, tilt: 0 })
    expect(styles.card.opacity).toBe('1')
  })

  it('カードが無いときは何もしない', () => {
    const { refs, styles } = createStage(['card'])
    applyEnterStart(refs, 'prev', 300)

    expect(styles.card).toEqual({})
  })
})

describe('applyEnterSettle', () => {
  it('カードを中央・傾きなし・不透明へ補間して戻す', () => {
    const { refs, styles } = createStage()
    applyEnterSettle(refs)

    expect(styles.card.transition).toMatch(SNAP_TRANSFORM_OPACITY)
    expect(cardMotionOf(styles.card.transform)).toEqual({ x: 0, tilt: 0 })
    expect(styles.card.opacity).toBe('1')
  })

  it('カードが無いときは何もしない', () => {
    const { refs, styles } = createStage(['card'])
    applyEnterSettle(refs)

    expect(styles.card).toEqual({})
  })
})
