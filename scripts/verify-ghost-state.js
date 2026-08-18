// verify-ghost-state.js — ゴースト状態機械の不変条件を実行中の画面で判定する。
// verify-s1.js と同じ注入型スクリプトだが、パン・ズームの落ち着きを待つ必要があるので
// async な即時実行関数にしてある(Playwright の page.evaluate も DevTools も Promise を待つ)。
//
// 【この検証を直す前に読むこと】スクリプトを通すためにスクリプトを直さない。
// 落ちた判定は実装かフック(data 属性)の不足を指しており、判定の閾値・セレクタ・期待値を
// 緩めて PASS にする変更は禁止する。検査0件は PASS ではなく FAIL として扱う。
//
// 前提: 配置セッションが開いていること([data-ghost="frame"] が存在すること)。
// プローブは実際の入力経路だけを使う — パンは端自動パンが飛ばす seatmap:edge-pan、
// ズームはキーボードの + と同じ経路。合成の pointerdown だけは掴み状態の遷移確認に使う。
;(async () => {
  const pass = []
  const fail = []
  const skip = []
  const ck = (name, ok, detail) => (ok ? pass : fail).push(name + (detail ? ` — ${detail}` : ''))
  const sk = (name, detail) => skip.push(name + (detail ? ` — ${detail}` : ''))

  // 中心の許容差。仕様が「1pxも動かない」なので実測誤差ぶんだけ見る
  const CENTER_TOL = 0.5
  // ゴースト表示寸法の下限(utils/layout/rect.ts の GHOST_DISPLAY_MIN と同値)
  const DISPLAY_MIN = 44
  const EDGE_PAN_EVENT = 'seatmap:edge-pan'
  const EDGE_PAN_END_EVENT = 'seatmap:edge-pan-end'

  const report = () => {
    const checked = pass.length + fail.length
    // 空虚な通過の防止: 1件も検査していない結果を PASS にはしない
    const verdict = checked === 0 || fail.length > 0 ? 'FAIL' : 'PASS'
    const out = { verdict, checked, pass, fail, skip }
    console.log(JSON.stringify(out, null, 1))
    return out
  }

  const raf = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const centerOf = (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  const frame = document.querySelector('[data-ghost="frame"]')
  const transformLayer = document.querySelector('[data-canvas-transform-layer="true"]')
  if (!frame || !transformLayer) {
    fail.push('ゴースト未起動 — [data-ghost="frame"] または変換レイヤーが見つからない')
    return report()
  }
  const readTransform = () => {
    const m = new DOMMatrixReadOnly(getComputedStyle(transformLayer).transform)
    return { scale: m.a || 1, tx: m.e, ty: m.f }
  }

  // ---- 1. 枠の存在 ----
  const frames = document.querySelectorAll('[data-ghost="frame"]')
  ck('ゴースト枠が1つだけ存在', frames.length === 1, `${frames.length}件`)

  // ---- 2. 初期状態は idle ----
  ck(
    '掴んでいない間の状態が idle',
    frame.getAttribute('data-ghost-state') === 'idle',
    `data-ghost-state=${frame.getAttribute('data-ghost-state')}`
  )

  // ---- 3. 表示箱の短辺 ----
  const rect0 = frame.getBoundingClientRect()
  ck(
    '表示箱の短辺が44px以上',
    Math.min(rect0.width, rect0.height) >= DISPLAY_MIN - 0.1,
    `${rect0.width.toFixed(1)}×${rect0.height.toFixed(1)}`
  )

  // ---- 4/5. パン: 地図は動き、ゴーストの画面中心は動かない ----
  const centerBeforePan = centerOf(frame)
  const tBeforePan = readTransform()
  for (let i = 0; i < 3; i++) {
    window.dispatchEvent(new CustomEvent(EDGE_PAN_EVENT, { detail: { dx: 60, dy: 0 } }))
  }
  window.dispatchEvent(new Event(EDGE_PAN_END_EVENT))
  await raf()
  await sleep(60)
  await raf()
  const tAfterPan = readTransform()
  const centerAfterPan = centerOf(frame)
  // 4と5を対にするのが要点。片方だけだと「何も起きていないから中心も動かない」を PASS と誤読する
  ck(
    'パンで地図が動いた(プローブが効いていることの実証)',
    Math.abs(tAfterPan.tx - tBeforePan.tx) > 1,
    `translateX ${tBeforePan.tx.toFixed(1)} → ${tAfterPan.tx.toFixed(1)}`
  )
  ck(
    'パンでゴーストの画面中心が動かない',
    Math.abs(centerAfterPan.x - centerBeforePan.x) <= CENTER_TOL &&
      Math.abs(centerAfterPan.y - centerBeforePan.y) <= CENTER_TOL,
    `Δ=${(centerAfterPan.x - centerBeforePan.x).toFixed(2)},${(centerAfterPan.y - centerBeforePan.y).toFixed(2)}`
  )
  // 元の位置へ戻す。以降の判定をパンで動かした後の座標で汚さない
  for (let i = 0; i < 3; i++) {
    window.dispatchEvent(new CustomEvent(EDGE_PAN_EVENT, { detail: { dx: -60, dy: 0 } }))
  }
  window.dispatchEvent(new Event(EDGE_PAN_END_EVENT))
  await raf()
  await sleep(60)

  // ---- 6/7. ズーム: 倍率は変わり、ゴーストの中心は動かず、箱は実寸に追随する ----
  const centerBeforeZoom = centerOf(frame)
  const rectBeforeZoom = frame.getBoundingClientRect()
  const tBeforeZoom = readTransform()
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }))
  // 補間があるので落ち着くまで待つ
  await sleep(700)
  await raf()
  const tAfterZoom = readTransform()
  const rectAfterZoom = frame.getBoundingClientRect()
  const centerAfterZoom = centerOf(frame)
  ck(
    'ズームで倍率が変わった(プローブが効いていることの実証)',
    Math.abs(tAfterZoom.scale - tBeforeZoom.scale) > 0.0001,
    `scale ${tBeforeZoom.scale.toFixed(4)} → ${tAfterZoom.scale.toFixed(4)}`
  )
  ck(
    'ズームでゴーストの画面中心が動かない',
    Math.abs(centerAfterZoom.x - centerBeforeZoom.x) <= CENTER_TOL &&
      Math.abs(centerAfterZoom.y - centerBeforeZoom.y) <= CENTER_TOL,
    `Δ=${(centerAfterZoom.x - centerBeforeZoom.x).toFixed(2)},${(centerAfterZoom.y - centerBeforeZoom.y).toFixed(2)}`
  )
  const shorterBefore = Math.min(rectBeforeZoom.width, rectBeforeZoom.height)
  const shorterAfter = Math.min(rectAfterZoom.width, rectAfterZoom.height)
  if (shorterBefore < DISPLAY_MIN + 0.5 || shorterAfter < DISPLAY_MIN + 0.5) {
    // 44px 下限で等比に持ち上げている領域では「実寸×倍率」と一致しないのが正しい
    sk(
      'ズームで表示箱が実寸に追随する',
      `44px下限の等比持ち上げ域(短辺 ${shorterBefore.toFixed(1)} → ${shorterAfter.toFixed(1)})のため判定対象外`
    )
  } else {
    const sizeRatio = rectAfterZoom.width / rectBeforeZoom.width
    const scaleRatio = tAfterZoom.scale / tBeforeZoom.scale
    ck(
      'ズームで表示箱が実寸に追随する',
      Math.abs(sizeRatio / scaleRatio - 1) <= 0.02,
      `幅比 ${sizeRatio.toFixed(4)} / 倍率比 ${scaleRatio.toFixed(4)}`
    )
  }

  // ---- 8/9. 掴み状態: 属性の遷移と枠の見た目 ----
  // 手動確認だった「リングが太く濃くなる」「掴み状態が焼き付かない」の機械判定側。
  // 実入力と同じ pointerdown / pointerup を流す(isPrimary を落とすと2本目扱いで受け付けない)
  const shadowIdle = getComputedStyle(frame).boxShadow
  const pointerId = 4173
  frame.dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: centerAfterZoom.x,
      clientY: centerAfterZoom.y,
      bubbles: true,
      cancelable: true,
    })
  )
  await raf()
  const stateGrabbed = frame.getAttribute('data-ghost-state')
  const shadowGrabbed = getComputedStyle(frame).boxShadow
  window.dispatchEvent(
    new PointerEvent('pointerup', {
      pointerId,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: centerAfterZoom.x,
      clientY: centerAfterZoom.y,
      bubbles: true,
    })
  )
  await raf()
  const stateReleased = frame.getAttribute('data-ghost-state')
  // 離した後のリングは box-shadow 0.2s の遷移を通って戻る。遷移中に読むと
  // 補間途中の値を「戻っていない」と誤判定するので、遷移が終わってから読む
  await sleep(320)
  const shadowReleased = getComputedStyle(frame).boxShadow
  ck(
    '掴むと dragging へ遷移し、離すと idle へ戻る(掴み状態が焼き付かない)',
    stateGrabbed === 'dragging' && stateReleased === 'idle',
    `掴み中=${stateGrabbed} 離した後=${stateReleased}`
  )
  ck(
    '掴んでいる間だけ枠の box-shadow が変わる',
    shadowGrabbed !== shadowIdle && shadowReleased === shadowIdle,
    `idle="${shadowIdle}" / 掴み中="${shadowGrabbed}"`
  )

  return report()
})()
