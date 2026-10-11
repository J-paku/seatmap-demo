// 07-admin-edit: 整列スナップ(ドラッグ中のエッジ・中心線吸着)計算
import { clamp } from './geometry'
import type { Rect } from './rect'
import type { ResizeHandle, ResizeLimits } from './resize-anchor'

// スクリーン基準28pxを現在ズーム倍率でviewBox単位に換算した値をしきい値とする
const SNAP_THRESHOLD_SCREEN_PX = 28
// §04-3: 大きい対象では画面基準28pxが相対的に細かすぎるので、短辺の15%を下限に敷く
const SNAP_THRESHOLD_SIZE_RATIO = 0.15

// 同率とみなす幅。最小距離との差がこの値未満なら同じグループに入れ、全てガイド線を出す
const SNAP_TIE_WINDOW = 1
// 同一軸でこの距離未満に並ぶガイド線は1本へ畳む
const GUIDE_MERGE_WINDOW = 2
// ガイド線の両端の出っ張り(viewBox単位)。画面px固定にするとズームで見かけの長さが変わる
const GUIDE_EXTEND = 10

// ガイド線(viewBox座標系。vertical=x位置の縦線・horizontal=y位置の横線)。
// start/end は線に沿った方向の区間で、両端の延長ぶん(GUIDE_EXTEND)を含んだ値。
// extend はその延長量 — 描画側が「延長を除いた実際の端点」を復元するのに要る。
// 画面座標へ写すときは extend も同じ倍率で写す(ズームで見かけの長さを変えないため)
export type SnapGuide = {
  axis: 'vertical' | 'horizontal'
  pos: number
  start: number
  end: number
  // 辺どうしの一致か、中心どうしの一致か。畳んだ線は片方でも center なら center
  type: 'edge' | 'center'
  extend: number
}

export type SnapResult = { x: number; y: number; guides: SnapGuide[] }

export type ResizeSnapResult = { rect: Rect; guides: SnapGuide[] }

// §04-3: しきい値 = max(画面28px ÷ 現在ズーム, 短辺×15%)。
// 小さい対象では画面基準が、大きい対象では寸法基準が勝つ
export const snapThreshold = (rect: Rect, scale: number): number =>
  Math.max(SNAP_THRESHOLD_SCREEN_PX / scale, Math.min(rect.w, rect.h) * SNAP_THRESHOLD_SIZE_RATIO)

// 1軸ぶんの3本の線。x軸なら 左辺 / 中心 / 右辺、y軸なら 上辺 / 中心 / 下辺
type Edges = { lo: number; mid: number; hi: number }

const edgesOf = (lo: number, size: number): Edges => ({ lo, mid: lo + size / 2, hi: lo + size })

// 吸着ペア。軸あたり5組だけ。配列の順序が「同率のときどれを適用するか」を決めるので、
// 並べ替えない・自動生成しない・距離順にソートしない
const DRAG_PAIRS: readonly { drag: keyof Edges; sib: keyof Edges; type: SnapGuide['type'] }[] = [
  { drag: 'lo', sib: 'lo', type: 'edge' },
  { drag: 'lo', sib: 'hi', type: 'edge' },
  { drag: 'hi', sib: 'lo', type: 'edge' },
  { drag: 'hi', sib: 'hi', type: 'edge' },
  { drag: 'mid', sib: 'mid', type: 'center' },
]

type Candidate = { diff: number; pos: number; type: SnapGuide['type']; sibling: Rect }

const solveDragAxis = (
  dragging: Rect,
  siblings: Rect[],
  thresholdViewBox: number,
  axis: 'x' | 'y'
): { delta: number; matched: Candidate[] } => {
  const d = axis === 'x' ? edgesOf(dragging.x, dragging.w) : edgesOf(dragging.y, dragging.h)
  const candidates: Candidate[] = []
  for (const sib of siblings) {
    const s = axis === 'x' ? edgesOf(sib.x, sib.w) : edgesOf(sib.y, sib.h)
    for (const pair of DRAG_PAIRS) {
      const diff = s[pair.sib] - d[pair.drag]
      if (Math.abs(diff) > thresholdViewBox) continue
      candidates.push({ diff, pos: s[pair.sib], type: pair.type, sibling: sib })
    }
  }
  if (candidates.length === 0) return { delta: 0, matched: [] }
  const min = Math.min(...candidates.map((c) => Math.abs(c.diff)))
  const matched = candidates.filter((c) => Math.abs(Math.abs(c.diff) - min) < SNAP_TIE_WINDOW)
  // 適用するのは同率グループの先頭。最小そのものへ差し替えない
  return { delta: matched[0].diff, matched }
}

// 同率グループの候補1つにつき1本。線に沿った区間は「吸着後のドラッグ矩形」と
// 「その候補の相手」の両端4点を覆う範囲へ、両端 GUIDE_EXTEND を外向きに足す
const dragGuidesOf = (snapped: Rect, matched: Candidate[], axis: 'x' | 'y'): SnapGuide[] =>
  matched.map((c) => {
    const along =
      axis === 'x'
        ? [snapped.y, snapped.y + snapped.h, c.sibling.y, c.sibling.y + c.sibling.h]
        : [snapped.x, snapped.x + snapped.w, c.sibling.x, c.sibling.x + c.sibling.w]
    return {
      axis: axis === 'x' ? ('vertical' as const) : ('horizontal' as const),
      pos: c.pos,
      start: Math.min(...along) - GUIDE_EXTEND,
      end: Math.max(...along) + GUIDE_EXTEND,
      type: c.type,
      extend: GUIDE_EXTEND,
    }
  })

// 同じ軸で位置差が GUIDE_MERGE_WINDOW 未満の線は1本へ畳む。区間は和集合、
// pos は先に入っていた側を残し、片方でも center なら畳んだ結果は center
const dedupeGuides = (lines: SnapGuide[]): SnapGuide[] => {
  const out: SnapGuide[] = []
  for (const line of lines) {
    const hit = out.find((r) => r.axis === line.axis && Math.abs(r.pos - line.pos) < GUIDE_MERGE_WINDOW)
    if (!hit) {
      out.push({ ...line })
      continue
    }
    hit.start = Math.min(hit.start, line.start)
    hit.end = Math.max(hit.end, line.end)
    if (line.type === 'center') hit.type = 'center'
  }
  return out
}

// ドラッグ中矩形を siblings(Team area・会議室・家具)のエッジ/中心線へ吸着。
// 移動なので大きさは変わらず、矩形ごと平行移動する。辺は辺と、中心は中心とだけ揃える —
// 交差ペア(自分の辺 ↔ 相手の中心線)を作ると、寄せた向きと逆へ跳んで相手の内側へ埋まる
export const computeSnap = (dragging: Rect, siblings: Rect[], thresholdViewBox: number): SnapResult => {
  const sx = solveDragAxis(dragging, siblings, thresholdViewBox, 'x')
  const sy = solveDragAxis(dragging, siblings, thresholdViewBox, 'y')
  const snapped: Rect = { ...dragging, x: dragging.x + sx.delta, y: dragging.y + sy.delta }
  const guides = dedupeGuides([
    ...dragGuidesOf(snapped, sx.matched, 'x'),
    ...dragGuidesOf(snapped, sy.matched, 'y'),
  ])
  return { x: snapped.x, y: snapped.y, guides }
}

// リサイズで吸着に参加させるドラッグ側の線。掴んだ側の辺だけを参加させ、
// 対辺と中心線は外す(参加させると固定したはずの対辺が引っぱられる)
type EdgePick = 'start' | 'end' | 'none'

// 掴んだハンドルが動かす辺。'nw' は x も y も始点側、'e' は x の終点側だけ動く
const pickOf = (handle: ResizeHandle, axis: 'x' | 'y'): EdgePick => {
  if (axis === 'x') return handle.includes('w') ? 'start' : handle.includes('e') ? 'end' : 'none'
  return handle.includes('n') ? 'start' : handle.includes('s') ? 'end' : 'none'
}

// 相手側の候補線は軸あたり3本。ドラッグ側は動く辺1本だけ
const RESIZE_LINES: readonly { key: keyof Edges; type: SnapGuide['type'] }[] = [
  { key: 'lo', type: 'edge' },
  { key: 'hi', type: 'edge' },
  { key: 'mid', type: 'center' },
]

type ResizeSnap = { pos: number; type: SnapGuide['type']; sibling: Rect } | null

const solveResizeAxis = (
  resized: Rect,
  siblings: Rect[],
  thresholdViewBox: number,
  axis: 'x' | 'y',
  pick: EdgePick,
  minSize: number
): ResizeSnap => {
  if (pick === 'none') return null
  const d = axis === 'x' ? edgesOf(resized.x, resized.w) : edgesOf(resized.y, resized.h)
  const movingPos = pick === 'start' ? d.lo : d.hi
  const fixedPos = pick === 'start' ? d.hi : d.lo
  let best: ResizeSnap = null
  let bestDiff = Infinity
  for (const sib of siblings) {
    const s = axis === 'x' ? edgesOf(sib.x, sib.w) : edgesOf(sib.y, sib.h)
    for (const line of RESIZE_LINES) {
      const pos = s[line.key]
      const diff = Math.abs(pos - movingPos)
      if (diff > thresholdViewBox) continue
      // 吸着後の寸法。符号付きで見るのでアンカーを跨いだ候補も同時に落ちる
      const size = pick === 'start' ? fixedPos - pos : pos - fixedPos
      // 最小寸法を割る候補はここで捨てる。クランプで丸めると、辺が届かない位置に
      // ガイドだけが残り、線が指す場所と実際の辺が食い違う
      if (size < minSize) continue
      if (diff < bestDiff) {
        bestDiff = diff
        best = { pos, type: line.type, sibling: sib }
      }
    }
  }
  return best
}

// clamp は max 側の保険としてだけ残す。最小寸法は候補の棄却で守るので min 側には触れない
const applyResizeAxis = (lo: number, size: number, snap: ResizeSnap, pick: EdgePick, min: number, max: number) => {
  if (!snap || pick === 'none') return { lo, size }
  if (pick === 'end') return { lo, size: clamp(snap.pos - lo, min, max) }
  const next = clamp(lo + size - snap.pos, min, max)
  return { lo: lo + size - next, size: next }
}

const resizeGuideOf = (rect: Rect, snap: ResizeSnap, axis: 'x' | 'y'): SnapGuide[] => {
  if (!snap) return []
  const along =
    axis === 'x'
      ? [rect.y, rect.y + rect.h, snap.sibling.y, snap.sibling.y + snap.sibling.h]
      : [rect.x, rect.x + rect.w, snap.sibling.x, snap.sibling.x + snap.sibling.w]
  return [
    {
      axis: axis === 'x' ? 'vertical' : 'horizontal',
      pos: snap.pos,
      start: Math.min(...along) - GUIDE_EXTEND,
      end: Math.max(...along) + GUIDE_EXTEND,
      type: snap.type,
      extend: GUIDE_EXTEND,
    },
  ]
}

// §04-3: リサイズ中は対辺固定で、動く辺だけをスナップさせる
export const computeResizeSnap = (
  resized: Rect,
  siblings: Rect[],
  thresholdViewBox: number,
  handle: ResizeHandle,
  limits: ResizeLimits
): ResizeSnapResult => {
  const pickX = pickOf(handle, 'x')
  const pickY = pickOf(handle, 'y')
  const snapX = solveResizeAxis(resized, siblings, thresholdViewBox, 'x', pickX, limits.minW)
  const snapY = solveResizeAxis(resized, siblings, thresholdViewBox, 'y', pickY, limits.minH)
  const nextX = applyResizeAxis(resized.x, resized.w, snapX, pickX, limits.minW, limits.max)
  const nextY = applyResizeAxis(resized.y, resized.h, snapY, pickY, limits.minH, limits.max)
  const rect: Rect = { x: nextX.lo, y: nextY.lo, w: nextX.size, h: nextY.size }
  return { rect, guides: [...resizeGuideOf(rect, snapX, 'x'), ...resizeGuideOf(rect, snapY, 'y')] }
}
