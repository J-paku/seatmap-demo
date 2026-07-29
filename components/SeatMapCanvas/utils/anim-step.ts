import { MAX_SCALE, clamp, levelToScale, scaleToLevel } from '@/lib/geometry'
import type { Transform } from '@/lib/geometry'
import type { Anim } from '../type'

// rAF ループ1フレーム分の計算。DOM には触れず、次の変換と次の演出状態だけを返す

// 慣性の減衰率と停止速度
const FRICTION = 0.92
const STOP_SPEED = 1.5
// 慣性中に LOD スナップショットを取り直す間隔(フレーム)
const SNAP_INTERVAL = 5
// lerp / bounce の追従率と収束判定
const EASE = 0.22
const LERP_EPSILON = 0.002
const BOUNCE_EPSILON = 0.0005

export type AnimStep = {
  transform: Transform
  // バウンス中のみ scale クランプを外す
  overscroll: boolean
  nextAnim: Anim
  // このフレームで scaleSnap を取り直すか
  commitSnap: boolean
}

export const stepAnim = (anim: Anim, t: Transform, minScale: number): AnimStep | null => {
  if (anim.kind === 'inertia') {
    const frame = anim.frame + 1
    const vx = anim.vx * FRICTION
    const vy = anim.vy * FRICTION
    const stopped = Math.hypot(vx, vy) < STOP_SPEED
    return {
      transform: { scale: t.scale, translateX: t.translateX + anim.vx, translateY: t.translateY + anim.vy },
      overscroll: false,
      nextAnim: stopped ? { kind: 'none' } : { kind: 'inertia', vx, vy, frame },
      commitSnap: stopped || frame % SNAP_INTERVAL === 0,
    }
  }

  if (anim.kind === 'lerp') {
    const curLevel = scaleToLevel(t.scale)
    const nextLevel = curLevel + (anim.targetLevel - curLevel) * EASE
    const scale = clamp(levelToScale(nextLevel), minScale, MAX_SCALE)
    const done = Math.abs(anim.targetLevel - scaleToLevel(scale)) < LERP_EPSILON
    return {
      transform: { scale, translateX: anim.ax - anim.alx * scale, translateY: anim.ay - anim.aly * scale },
      overscroll: false,
      nextAnim: done ? { kind: 'none' } : anim,
      commitSnap: done,
    }
  }

  if (anim.kind === 'bounce') {
    const scale = t.scale + (anim.limit - t.scale) * EASE
    const done = Math.abs(anim.limit - scale) < BOUNCE_EPSILON
    // 収束したら誤差なしの limit へ吸着させる
    const settled = done ? anim.limit : scale
    return {
      transform: {
        scale: settled,
        translateX: anim.ax - anim.alx * settled,
        translateY: anim.ay - anim.aly * settled,
      },
      overscroll: !done,
      nextAnim: done ? { kind: 'none' } : anim,
      commitSnap: done,
    }
  }

  return null
}
