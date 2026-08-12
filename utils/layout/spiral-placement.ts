// §02-3 既存チーム取り込みの自動配置探索。アンカーを中心に 15px 格子でスパイラルに広がり、
// 最初に置ける格子点を返す。回避3段(①チーム+家具回避 ②チームのみ回避 ③強制オフセット配置)の
// 「順に緩めていく」順序もこのファイルが持つ — 段を別々の場所に書くと
// 「②で置いたつもりが③だった」という取り違えを後から追えなくなる。
//
// 何を障害物とみなすかは呼び出し側の判定関数に委ねる。ここが持つのは格子の刻みと走査順だけで、
// レイアウトの当たり判定規則(utils/layout/layout-rules)を二重に持たない
import { clamp } from './geometry'
import type { Rect } from './rect'

// 探索格子の刻み(§02-3「15px格子のスパイラル探索」)
const SPIRAL_STEP = 15

// 回避の強さ。前から順に試し、最初に置けた段の結果を返す。
// 'forced' は既存物を一切避けない段で、フロア外と「同じ取り込みで既に置いた枠」だけを避ける
export type PlacementStage = 'avoid-all' | 'avoid-teams' | 'forced'

const PLACEMENT_STAGES: readonly PlacementStage[] = ['avoid-all', 'avoid-teams', 'forced']

export type SpiralSpot = { rect: Rect; stage: PlacementStage }

// アンカーからの格子オフセットを同心リング順(内側 → 外側)に列挙する。
// リング内は「上辺を左→右・右辺を上→下・下辺を右→左・左辺を下→上」の固定順なので、
// 同じ入力なら必ず同じ位置に落ちる(配置結果が実行のたびに変わらない)
const spiralOffsets = (maxRing: number): { dx: number; dy: number }[] => {
  const offsets: { dx: number; dy: number }[] = [{ dx: 0, dy: 0 }]
  for (let ring = 1; ring <= maxRing; ring += 1) {
    for (let x = -ring; x <= ring; x += 1) offsets.push({ dx: x, dy: -ring })
    for (let y = -ring + 1; y <= ring; y += 1) offsets.push({ dx: ring, dy: y })
    for (let x = ring - 1; x >= -ring; x -= 1) offsets.push({ dx: x, dy: ring })
    for (let y = ring - 1; y >= -ring + 1; y -= 1) offsets.push({ dx: -ring, dy: y })
  }
  return offsets
}

// アンカー(矩形の中心になる点)から外へ広がり、置ける最初の格子点の矩形を返す。
// 3段すべてが尽きたときだけ null を返す — 呼び出し側はその件数を警告文言に出す
export const findSpiralSpot = (
  anchor: { x: number; y: number },
  size: { width: number; height: number },
  bounds: { width: number; height: number },
  isBlocked: (rect: Rect, stage: PlacementStage) => boolean
): SpiralSpot | null => {
  // アンカーはフロアの内側へ寄せる。フロア外から始めると必要な探索半径が読めなくなり、
  // 「遠くまで見ているつもりで端まで届いていない」無言の失敗になる
  const centerX = clamp(anchor.x, 0, bounds.width)
  const centerY = clamp(anchor.y, 0, bounds.height)
  // フロアのどの端から始めても反対の端まで届く半径
  const maxRing = Math.ceil(Math.max(bounds.width, bounds.height) / SPIRAL_STEP)
  const offsets = spiralOffsets(maxRing)

  for (const stage of PLACEMENT_STAGES) {
    for (const offset of offsets) {
      const rect: Rect = {
        x: centerX + offset.dx * SPIRAL_STEP - size.width / 2,
        y: centerY + offset.dy * SPIRAL_STEP - size.height / 2,
        w: size.width,
        h: size.height,
      }
      // フロア外は段に関わらず置けない。キャンバスはフロアの外側まで見えるので、
      // 「画面上は空いて見えるがフロア外」という位置が実在する
      if (rect.x < 0 || rect.y < 0) continue
      if (rect.x + rect.w > bounds.width || rect.y + rect.h > bounds.height) continue
      if (isBlocked(rect, stage)) continue
      return { rect, stage }
    }
  }
  return null
}
