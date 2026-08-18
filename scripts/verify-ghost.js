// verify-ghost.js — ゴースト配置(ビューファインダー式)の受入判定。verify-s1.js / verify-edit-anchors.js と
// 同じ注入型スクリプトで、実行中の画面へ丸ごと貼ると { verdict, state, mode, phase, checked, pass, fail, skip }
// を返す。
//
// 【この検証を直す前に読むこと】スクリプトを通すためにスクリプトを直さない。
// 落ちた判定は実装かフック(data 属性)の不足を指しており、判定の閾値・セレクタ・期待値を緩めて
// PASS にする変更は禁止する。フックが無くて判定できない場合も skip ではなく fail に落とす
// (0件検査の PASS が最も危険 — docs/seat-map/testing.md 2章と同じ方針)。期待値を変えてよいのは
// 仕様そのものが変わったときだけで、そのときは docs 側の受入条件と一組で直す。
//
// verify-s1.js と違い戻り値は Promise。パン・ズームの不変条件は1フレームの静止画では判定できず、
// 実入力(seatmap:edge-pan / wheel)を起こして数フレーム待つ必要があるため。
//   - Playwright: await page.evaluate(src) でそのまま解決値が取れる
//   - devtools: 貼ると Promise が返る。結果は最後に console.log される JSON を見る
//
// 呼び出し側の期待(任意)は window.__ghostVerify で渡す。指定しなければ「今の状態の内部整合」だけを見る。
//   mode: 'open'(既定) — 配置セッションが開いている前提。開いていなければ fail
//         'closed'     — 配置セッションが畳まれている前提。残骸が1つでもあれば fail
//   phase: 報告に載せるだけのラベル(どのシナリオの実行かを出力で見分ける)
//   expectBlocked: true|false — 重なり状態の期待。実際と違えば fail
//   expectGuides: 'some'|'none' — ガイド線の期待。実際と違えば fail
//   expectState: 'idle'(既定)|'dragging'|'resizing' — 掴み状態の期待
//   probes: true(既定)|false — パン・ズームの実入力を起こすか。掴んだまま注入するとき(ガイドの
//           出現判定)は false にする。false のぶんは skip に積み、ランナー側が別シナリオの pass で
//           消し込む(消し込めない skip が1つでも残れば総合判定は FAIL)
;(async () => {
  const pass = [], fail = [], skip = []
  const ck = (name, ok, detail) => (ok ? pass : fail).push(name + (detail ? ` — ${detail}` : ''))
  const sk = (name, detail) => skip.push(name + (detail ? ` — ${detail}` : ''))

  const opts = window.__ghostVerify || {}
  const mode = opts.mode === 'closed' ? 'closed' : 'open'
  const phase = typeof opts.phase === 'string' ? opts.phase : null
  const expectBlocked = typeof opts.expectBlocked === 'boolean' ? opts.expectBlocked : null
  const expectGuides = opts.expectGuides === 'some' || opts.expectGuides === 'none' ? opts.expectGuides : null
  const expectState =
    opts.expectState === 'dragging' || opts.expectState === 'resizing' ? opts.expectState : 'idle'
  const withProbes = opts.probes !== false

  // 幾何の許容差。仕様が「誤差1px」なので1pxを基準にする
  const TOL = 1
  // ガイド線だけは破線ボーダー1.2pxぶんの厚みがあり、線の中心と境界矩形の縁が最大0.6pxずれる。
  // 1.2px の丸めを足して2pxまで許容する(緩めた閾値ではなく、線幅そのものの実測ぶん)
  const TOL_GUIDE = 2
  // ゴースト表示寸法の下限(utils/layout/rect.ts の GHOST_DISPLAY_MIN と同値)。
  // 論理寸法×倍率がこれを下回るときは下限が効くので、期待値の側にも同じ下限を掛ける
  const DISPLAY_MIN = 44
  const GHOST_LABEL = '配置プレビュー（ドラッグで移動）'
  const HINT_FREE = 'ドラッグで移動'
  const HINT_BLOCKED = '赤い枠と重なっています'
  const CANVAS_ID = 'seatmap-bg-root'
  const EDGE_PAN_EVENT = 'seatmap:edge-pan'
  const EDGE_PAN_END_EVENT = 'seatmap:edge-pan-end'

  const report = (state) => {
    const checked = pass.length + fail.length
    // 空虚な通過の防止: 1件も検査していない結果を PASS にはしない
    const verdict = checked === 0 ? 'FAIL' : fail.length === 0 ? 'PASS' : 'FAIL'
    const out = { verdict, state, mode, phase, checked, pass, fail, skip }
    console.log(JSON.stringify(out, null, 1))
    return out
  }

  const q = (sel, root) => [...(root || document).querySelectorAll(sel)]
  const near = (a, b, tol) => Math.abs(a - b) <= tol
  const num = (el, name) => {
    const raw = el && el.getAttribute(name)
    if (raw === null || raw === undefined || raw === '') return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  }
  const centerOf = (rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  const iconTextOf = (root) => {
    if (!root) return null
    const icon = q('.material-symbols-outlined, .icon-msr-filled, .icon-msr-thin', root).find(
      (el) => el.textContent.trim().length > 0
    )
    return icon ? icon.textContent.trim() : null
  }
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  // 実入力 → 変換の書き込み(命令的)→ MutationObserver → React の再描画、の順で伝わる。
  // rAF だけでは再描画前を読むことがあるので、フレームとタイマーを混ぜて落ち着かせる
  const settle = async () => {
    await nextFrame()
    await nextFrame()
    await sleep(60)
    await nextFrame()
  }

  // ---- 0. 前提: 座席マップ本体 ----
  const canvas = document.getElementById(CANVAS_ID)
  const transformLayer = document.querySelector('[data-canvas-transform-layer="true"]')
  ck(`キャンバス背景(#${CANVAS_ID})が存在`, !!canvas)
  ck('変換レイヤー([data-canvas-transform-layer])が存在', !!transformLayer)
  if (!canvas || !transformLayer) {
    return report('unknown')
  }

  const readTransform = () => {
    const m = new DOMMatrixReadOnly(getComputedStyle(transformLayer).transform)
    return { scale: m.a || 1, tx: m.e, ty: m.f }
  }

  // ゴースト層・枠の特定。枠の識別子は STEP2 が data-ghost-frame、STEP4 が data-ghost="frame" を
  // 宣言しているので両方を受ける(どちらで見つけたかは detail に残す)。CSS Modules のクラス名は
  // ハッシュ化されるため、この2つ以外に枠を機械的に特定する手段は無い
  const FRAME_SELECTOR = '[data-ghost="frame"], [data-ghost-frame="true"]'
  const layers = q('[data-ghost="layer"]')
  const frames = [...new Set(q(FRAME_SELECTOR))]

  // ---- closed モード: セッションが畳まれたことの判定。残骸が1つでもあれば fail ----
  if (mode === 'closed') {
    ck('ゴースト層が残っていない', layers.length === 0, `${layers.length}件`)
    ck('ゴースト枠が残っていない', frames.length === 0, `${frames.length}件`)
    ck('配置プレビューのアンカーが残っていない', q(`[aria-label="${GHOST_LABEL}"]`).length === 0)
    ck('ガイド線が残っていない', q('[data-ghost="guide"]').length === 0)
    ck('ヒントが残っていない', q('[data-ghost="hint"]').length === 0)
    ck('アクションバーが残っていない', q('[data-ghost="actionbar"]').length === 0)
    ck('障害物の強調枠が残っていない', q('[data-ghost="obstacle"]').length === 0)
    // 暗幕はゴースト層の子なので層が消えていれば消える。中心でキャンバスが取れることを実測して裏を取る
    const c = centerOf(canvas.getBoundingClientRect())
    const top = document.elementFromPoint(c.x, c.y)
    ck(
      'キャンバス中心がキャンバス自身(または子孫)で取れる',
      !!top && (top === canvas || canvas.contains(top)),
      top ? `${top.tagName}.${top.className}` : 'null'
    )
    return report('no-ghost')
  }

  // ---- open モード: 前提はゴーストが1つ開いていること ----
  ck('ゴースト層が1つだけ存在', layers.length === 1, `${layers.length}件`)
  ck('ゴースト枠が1つだけ存在', frames.length === 1, `${frames.length}件`)
  if (layers.length !== 1 || frames.length !== 1) {
    // 前提が満たされていない状態で以降の実測を続けても意味が無いので、ここで打ち切る。
    // skip ではなく上の fail が立ったまま FAIL を返す
    return report('ghost-placement')
  }
  const layer = layers[0]
  const frame = frames[0]
  const frameHook = frame.getAttribute('data-ghost') === 'frame' ? 'data-ghost="frame"' : 'data-ghost-frame="true"'
  ck('枠がゴースト層の内側にある', layer.contains(frame), `枠の識別に使ったフック: ${frameHook}`)

  // ---- 1. 層の宣言(モード・重なり・リサイズ可否・対象参照) ----
  const modeAttr = layer.getAttribute('data-mode')
  const blockedAttr = layer.getAttribute('data-blocked')
  const resizableAttr = layer.getAttribute('data-ghost-resizable')
  const refAttr = layer.getAttribute('data-ghost-ref')
  ck('層の data-mode が create|move', modeAttr === 'create' || modeAttr === 'move', `data-mode=${modeAttr}`)
  ck('層の data-blocked が true|false', blockedAttr === 'true' || blockedAttr === 'false', `data-blocked=${blockedAttr}`)
  ck(
    '層の data-ghost-resizable が true|false',
    resizableAttr === 'true' || resizableAttr === 'false',
    `data-ghost-resizable=${resizableAttr}`
  )
  const isMove = modeAttr === 'move'
  const blocked = blockedAttr === 'true'
  const resizable = resizableAttr === 'true'
  ck(
    '移動モードだけが対象参照(data-ghost-ref)を持つ',
    isMove ? typeof refAttr === 'string' && /^[a-z]+:.+/.test(refAttr) : refAttr === null,
    `mode=${modeAttr} ref=${refAttr}`
  )
  if (expectBlocked !== null) {
    ck('呼び出し側が期待した重なり状態と一致', blocked === expectBlocked, `期待=${expectBlocked} 実際=${blocked}`)
  }

  // ---- 2. 掴み状態 ----
  const stateAttr = frame.getAttribute('data-ghost-state')
  const draggingAttr = frame.getAttribute('data-dragging')
  const hasState = stateAttr === 'idle' || stateAttr === 'dragging' || stateAttr === 'resizing'
  const hasDragging = draggingAttr === 'true' || draggingAttr === 'false'
  ck(
    '枠が掴み状態を公開している(data-ghost-state または data-dragging)',
    hasState || hasDragging,
    `data-ghost-state=${stateAttr} data-dragging=${draggingAttr}`
  )
  if (hasState && hasDragging) {
    ck(
      '2つの掴み状態表現が矛盾しない',
      (stateAttr === 'idle') === (draggingAttr === 'false'),
      `data-ghost-state=${stateAttr} data-dragging=${draggingAttr}`
    )
  }
  ck(
    `掴み状態が期待どおり(${expectState})`,
    hasState ? stateAttr === expectState : draggingAttr === String(expectState !== 'idle'),
    `data-ghost-state=${stateAttr} data-dragging=${draggingAttr}`
  )
  {
    // 掴んでいる間だけカーソルが変わる(§04-2 の「掴み中は grabbing」の機械判定側)
    const cursor = getComputedStyle(frame).cursor
    ck(`カーソルが掴み状態と一致(${expectState})`, cursor === (expectState === 'idle' ? 'grab' : 'grabbing'), cursor)
  }

  // ---- 3. 読み上げアンカー ----
  const labelled = q(`[aria-label="${GHOST_LABEL}"]`)
  ck('配置プレビューのアンカーがちょうど1件', labelled.length === 1, `${labelled.length}件`)
  if (labelled.length === 1) {
    ck('アンカーが枠自身または層の内側にある', labelled[0] === frame || layer.contains(labelled[0]))
  }
  // run-all-checks.mjs のゴースト到達判定はこのセレクタを待つ。role を変えるなら
  // 同じ変更の中でランナーの waitForSelector も直す必要がある(直さないと全状態が到達失敗になる)
  ck(
    'run-all-checks.mjs の到達セレクタ([role="img"]付き)が生きている',
    q(`[role="img"][aria-label="${GHOST_LABEL}"]`).length === 1,
    'role を変更したなら run-all-checks.mjs の reachGhostPlacement も同時に直すこと'
  )

  // ---- 4. 幾何: 画面寸法 = 論理寸法 × 現在倍率 ----
  const logical = {
    x: num(frame, 'data-ghost-logical-x'),
    y: num(frame, 'data-ghost-logical-y'),
    w: num(frame, 'data-ghost-logical-w'),
    h: num(frame, 'data-ghost-logical-h'),
  }
  const hasLogical = logical.x !== null && logical.y !== null && logical.w !== null && logical.h !== null
  ck(
    '枠が論理矩形(data-ghost-logical-x/y/w/h)を公開している',
    hasLogical,
    `x=${logical.x} y=${logical.y} w=${logical.w} h=${logical.h}`
  )
  const frameRect0 = frame.getBoundingClientRect()
  ck(
    '枠の短辺が44px以上',
    Math.min(frameRect0.width, frameRect0.height) >= DISPLAY_MIN - TOL,
    `${Math.round(frameRect0.width)}×${Math.round(frameRect0.height)}`
  )

  // 論理 → 画面の写像。use-ghost-placement と同じ式(キャンバス矩形 + 変換層の translate/scale)を
  // 実測値だけで組み直し、DOM 実測の枠と突き合わせる
  const expectScreen = (t, canvasRect) => ({
    cx: canvasRect.left + t.tx + (logical.x + logical.w / 2) * t.scale,
    cy: canvasRect.top + t.ty + (logical.y + logical.h / 2) * t.scale,
    w: Math.max(logical.w * t.scale, DISPLAY_MIN),
    h: Math.max(logical.h * t.scale, DISPLAY_MIN),
  })

  const t0 = readTransform()
  const canvasRect0 = canvas.getBoundingClientRect()
  if (hasLogical) {
    const want = expectScreen(t0, canvasRect0)
    const got = { c: centerOf(frameRect0), w: frameRect0.width, h: frameRect0.height }
    ck(
      '枠の画面寸法 = 論理寸法×現在倍率(±1px)',
      near(got.w, want.w, TOL) && near(got.h, want.h, TOL),
      `実測 ${got.w.toFixed(1)}×${got.h.toFixed(1)} / 期待 ${want.w.toFixed(1)}×${want.h.toFixed(1)} (scale=${t0.scale.toFixed(4)})`
    )
    ck(
      '枠の画面中心 = 論理中心の写像(±1px)',
      near(got.c.x, want.cx, TOL) && near(got.c.y, want.cy, TOL),
      `実測 ${got.c.x.toFixed(1)},${got.c.y.toFixed(1)} / 期待 ${want.cx.toFixed(1)},${want.cy.toFixed(1)}`
    )
  } else {
    // 論理寸法が公開されていない = この検査は成立しない。上の fail が代表するので黙って消さない
    sk('枠の画面寸法 = 論理寸法×現在倍率(±1px)', 'data-ghost-logical-* が無く判定不能(同名の fail 済み)')
    sk('枠の画面中心 = 論理中心の写像(±1px)', 'data-ghost-logical-* が無く判定不能(同名の fail 済み)')
  }

  // 掴み直しでは実体が画面に残っているので、変換の式を経由しない独立の裏取りができる
  if (isMove && refAttr) {
    const entity =
      document.querySelector(`[data-edit-object="${CSS.escape(refAttr)}"]`) ||
      document.querySelector(`[data-team-id="${CSS.escape(refAttr.split(':')[1] || '')}"]`)
    if (entity) {
      const er = entity.getBoundingClientRect()
      ck(
        '掴み直し中の枠の画面寸法が実体と一致(±1px)',
        near(frameRect0.width, Math.max(er.width, DISPLAY_MIN), TOL) &&
          near(frameRect0.height, Math.max(er.height, DISPLAY_MIN), TOL),
        `枠 ${frameRect0.width.toFixed(1)}×${frameRect0.height.toFixed(1)} / 実体 ${er.width.toFixed(1)}×${er.height.toFixed(1)}`
      )
    } else {
      ck('掴み直しの対象実体が DOM に居る', false, `data-ghost-ref=${refAttr} に対応する実体が見つからない`)
    }
  } else {
    // skip の名前は pass 側と同じにする。ランナーは名前一致で消し込むので、別名にすると
    // 「どの局面でも実測されていない」と誤判定される
    sk('掴み直し中の枠の画面寸法が実体と一致(±1px)', '新規配置モードでは実体が存在しないため対象外')
  }

  // ---- 5. 当たり判定: 層はポインタを奪わない ----
  ck('ゴースト層自身がポインタを受けない', getComputedStyle(layer).pointerEvents === 'none', getComputedStyle(layer).pointerEvents)
  ck('枠自身はポインタを受ける', getComputedStyle(frame).pointerEvents === 'auto', getComputedStyle(frame).pointerEvents)
  {
    const c = centerOf(frameRect0)
    const top = document.elementFromPoint(c.x, c.y)
    ck(
      '枠の中心が枠自身(または子孫)で取れる',
      !!top && (top === frame || frame.contains(top)),
      top ? `${top.tagName}` : 'null'
    )
  }
  {
    // キャンバス内に格子状の測点を取り、ゴーストの掴める部品に覆われていない点だけを残す。
    // 「層の下でキャンバスがポインタを受け続ける」= どの測点でも層の要素が返らないこと
    const grabbables = q(
      '[data-ghost="frame"], [data-ghost-frame="true"], [data-ghost="hint"], [data-ghost="actionbar"], [data-ghost="resize-handle"]'
    ).map((el) => el.getBoundingClientRect())
    const covered = (x, y) => grabbables.some((r) => x >= r.left - 2 && x <= r.right + 2 && y >= r.top - 2 && y <= r.bottom + 2)
    const points = []
    for (let i = 1; i <= 5; i++) {
      for (let j = 1; j <= 5; j++) {
        const x = canvasRect0.left + (canvasRect0.width * i) / 6
        const y = canvasRect0.top + (canvasRect0.height * j) / 6
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue
        if (covered(x, y)) continue
        points.push({ x, y })
      }
    }
    const hits = points.map((p) => ({ p, el: document.elementFromPoint(p.x, p.y) }))
    const intercepted = hits.filter((h) => h.el && layer.contains(h.el))
    const reached = hits.filter((h) => h.el && (h.el === canvas || canvas.contains(h.el)))
    ck('掴める部品の外に測点が取れる', points.length > 0, `${points.length}点`)
    ck(
      'ゴースト層が下のキャンバスからポインタを奪わない',
      points.length > 0 && intercepted.length === 0,
      `層が受けた測点 ${intercepted.length}/${points.length}`
    )
    ck(
      '層の下でキャンバスがポインタを受け続ける',
      reached.length > 0,
      `キャンバスへ届いた測点 ${reached.length}/${points.length}`
    )
  }

  // ---- 6. 重なり状態の一貫性(ヒント・確定ボタン・アイコン・障害物枠) ----
  const hint = document.querySelector('[data-ghost="hint"]')
  ck('ヒントが1つ存在', !!hint)
  if (hint) {
    const live = hint.matches('[role="status"][aria-live="polite"]')
      ? hint
      : hint.querySelector('[role="status"][aria-live="polite"]')
    ck('ヒント文言が role=status aria-live=polite に包まれている', !!live)
    const text = (live || hint).textContent.trim()
    ck(
      'ヒント文言が重なり状態と一致(完全一致)',
      text === (blocked ? HINT_BLOCKED : HINT_FREE),
      `blocked=${blocked} 実際="${text}"`
    )
    const flipped = hint.getAttribute('data-flipped')
    ck('ヒントが data-flipped(true|false)を持つ', flipped === 'true' || flipped === 'false', `data-flipped=${flipped}`)
  }

  const bar = document.querySelector('[data-ghost="actionbar"]')
  ck('アクションバーが1つ存在', !!bar)
  if (bar) {
    const buttons = q('button', bar)
    const roleOf = (b) => {
      const label = b.getAttribute('aria-label') || ''
      if (label === 'この位置に配置' || label === '重なっているため配置できません') return 'confirm'
      if (label === '配置をキャンセル') return 'cancel'
      if (/を削除$/.test(label)) return 'delete'
      return 'other'
    }
    const order = buttons.map(roleOf)
    const wantOrder = isMove ? ['delete', 'confirm', 'cancel'] : ['confirm', 'cancel']
    ck(
      'アクションバーのボタン構成と DOM 順が仕様どおり',
      order.join(',') === wantOrder.join(','),
      `実際=[${order.join(',')}] 期待=[${wantOrder.join(',')}]`
    )
    const confirm = buttons.find((b) => roleOf(b) === 'confirm')
    ck('確定ボタンが1つ存在', !!confirm)
    if (confirm) {
      ck(
        '確定ボタンの有効/無効が重なり状態と一致',
        confirm.disabled === blocked,
        `blocked=${blocked} disabled=${confirm.disabled}`
      )
      ck(
        '確定ボタンの文言が重なり状態と一致',
        confirm.getAttribute('aria-label') === (blocked ? '重なっているため配置できません' : 'この位置に配置'),
        confirm.getAttribute('aria-label')
      )
      const icon = iconTextOf(confirm)
      ck('確定ボタンのアイコンが重なり状態と一致', icon === (blocked ? 'block' : 'check'), `icon=${icon}`)
    }
    const cancel = buttons.find((b) => roleOf(b) === 'cancel')
    ck('キャンセルボタンが1つ存在', !!cancel)
    buttons.forEach((b) => {
      const r = b.getBoundingClientRect()
      ck(
        `アクションバーのボタンが44px角以上(${b.getAttribute('aria-label')})`,
        r.width >= 44 - TOL && r.height >= 44 - TOL,
        `${r.width.toFixed(1)}×${r.height.toFixed(1)}`
      )
    })
  }

  const centerHandle = document.querySelector('[data-ghost="handle"]')
  ck('中央ハンドルが1つ存在', !!centerHandle)
  if (centerHandle) {
    ck('中央ハンドルはポインタを受けない', getComputedStyle(centerHandle).pointerEvents === 'none')
    ck('中央ハンドルが aria-hidden か読み上げアンカーのいずれか', centerHandle.getAttribute('aria-hidden') === 'true' || centerHandle.getAttribute('aria-label') === GHOST_LABEL)
    const icon = iconTextOf(centerHandle)
    ck('中央ハンドルのアイコンが重なり状態と一致', icon === (blocked ? 'block' : 'drag_pan'), `icon=${icon}`)
  }

  const badges = q('[data-ghost="badge"]')
  ck('名前バッジは移動モードのときだけ出る', isMove ? badges.length === 1 : badges.length === 0, `${badges.length}件 mode=${modeAttr}`)

  const obstacles = q('[data-ghost="obstacle"]')
  ck(
    '障害物の強調枠の有無が重なり状態と一致',
    blocked ? obstacles.length > 0 : obstacles.length === 0,
    `blocked=${blocked} 障害物枠=${obstacles.length}件`
  )

  // ---- 7. リサイズハンドル ----
  const handles = q('[data-ghost="resize-handle"]')
  const wantHandles = resizable && !blocked ? 8 : 0
  ck(
    'リサイズハンドルの数が宣言(data-ghost-resizable)と一致',
    handles.length === wantHandles,
    `resizable=${resizable} blocked=${blocked} 実際=${handles.length}個 期待=${wantHandles}個`
  )
  if (handles.length > 0) {
    const labelled8 = handles.every(
      (h) => h.getAttribute('role') === 'button' && h.getAttribute('aria-label') === 'サイズを変更'
    )
    const grabbable = handles.every((h) => getComputedStyle(h).pointerEvents === 'auto')
    ck(
      'リサイズハンドルの属性検査',
      labelled8 && grabbable,
      `role/aria-label=${labelled8} pointer-events=${grabbable}`
    )
  } else {
    sk('リサイズハンドルの属性検査', `このゴーストはハンドルを持たない(resizable=${resizable} blocked=${blocked})`)
  }

  // ---- 8. ガイド線 ----
  // 枠の3本線(始端・中心・終端)。ガイドはこのいずれかと一致していなければ「何に揃えたか」を示せない
  const frameLines = (rect) => ({
    vertical: [rect.left, rect.left + rect.width / 2, rect.right],
    horizontal: [rect.top, rect.top + rect.height / 2, rect.bottom],
  })
  const guidePos = (el) => {
    const r = el.getBoundingClientRect()
    const axis = el.getAttribute('data-guide-axis')
    return axis === 'vertical' ? r.left + r.width / 2 : r.top + r.height / 2
  }
  const checkGuides = (label, frameRect) => {
    const guides = q('[data-ghost="guide"]')
    if (expectGuides !== null) {
      ck(
        `${label}: 呼び出し側が期待したガイド本数の有無と一致`,
        expectGuides === 'some' ? guides.length > 0 : guides.length === 0,
        `期待=${expectGuides} 実際=${guides.length}本`
      )
    }
    if (guides.length === 0) {
      // 名前はガイドが出ている局面の pass と揃える(ランナーが名前一致で消し込むため)
      sk('ガイド線の形状検査', `${label}: 今この瞬間は吸着していないため0本(出す/消すの網羅はランナー側の責務)`)
      return guides
    }
    const lines = frameLines(frameRect)
    const axisOk = guides.every(
      (g) => g.getAttribute('data-guide-axis') === 'vertical' || g.getAttribute('data-guide-axis') === 'horizontal'
    )
    const shapeOk = guides.every((g) => {
      const r = g.getBoundingClientRect()
      return g.getAttribute('data-guide-axis') === 'vertical' ? r.height > r.width : r.width > r.height
    })
    const opaque = guides.every((g) => getComputedStyle(g).opacity === '1')
    const strays = guides.filter((g) => {
      const axis = g.getAttribute('data-guide-axis')
      const candidates = axis === 'vertical' ? lines.vertical : lines.horizontal
      return !candidates.some((line) => near(guidePos(g), line, TOL_GUIDE))
    })
    // 4条件を1件にまとめるのは、局面によって出たり出なかったりする判定の名前を1つに保つため。
    // 内訳は detail に必ず残す(どれが落ちたか分からない集約にはしない)
    ck(
      'ガイド線の形状検査',
      axisOk && shapeOk && opaque && strays.length === 0,
      `${label}: ${guides.length}本 axis=${axisOk} 形状=${shapeOk} 不透明=${opaque} 枠の線と不一致=${strays.length}本`
    )
    return guides
  }
  checkGuides('静止時', frameRect0)

  if (!withProbes) {
    // 掴んだままの注入では地図を動かせない(自動パンとドラッグ追従が混ざって何を測ったか分からなくなる)。
    // ここで落とした5件は、ランナーが別シナリオの pass で消し込む責務を負う
    sk('パンで地図が動いた(検出力の裏取り)', 'probes:false 指定のため未実行')
    sk('パンでゴースト中心が画面上で動かない(動いた分は吸着で説明できる)', 'probes:false 指定のため未実行')
    sk('ズームで倍率が変わった(検出力の裏取り)', 'probes:false 指定のため未実行')
    sk('ズームでゴースト中心が画面上で動かない(動いた分は吸着で説明できる)', 'probes:false 指定のため未実行')
    sk('ズーム後も枠の画面寸法 = 論理寸法×倍率(±1px)', 'probes:false 指定のため未実行')
    return report('ghost-placement')
  }

  // ---- 9. パンの不変条件: 地図は動き、ゴーストは画面上で動かない ----
  // 入力は use-edge-auto-pan が実際に飛ばすイベントと同じもの。ゴーストのドラッグを合成せずに
  // 「地図側だけが動く」状況を作れる唯一の実入力経路
  const centerBeforePan = centerOf(frame.getBoundingClientRect())
  const panSteps = 8
  const panDx = 40
  for (let i = 0; i < panSteps; i++) {
    window.dispatchEvent(new CustomEvent(EDGE_PAN_EVENT, { detail: { dx: panDx, dy: 0 } }))
  }
  await settle()
  const tPan = readTransform()
  const framePan = frame.getBoundingClientRect()
  const centerAfterPan = centerOf(framePan)
  ck(
    'パンで地図が動いた(検出力の裏取り)',
    Math.abs(tPan.tx - t0.tx) >= panSteps * panDx - TOL,
    `translateX ${t0.tx.toFixed(1)} → ${tPan.tx.toFixed(1)}`
  )
  {
    const dx = centerAfterPan.x - centerBeforePan.x
    const dy = centerAfterPan.y - centerBeforePan.y
    // ズレが1pxを超えるのは吸着が引き直された時だけ許される。その場合はガイドが実際に出ていて、
    // かつ枠の辺と一致していることを求める(§04-3: パン中もスナップを引き直す)。
    // ガイドで説明できないズレ = ゴーストが地図に貼り付いている = 不合格
    const guidesNow = q('[data-ghost="guide"]')
    const lines = frameLines(framePan)
    const explained = (delta, axis) =>
      Math.abs(delta) <= TOL ||
      guidesNow
        .filter((g) => g.getAttribute('data-guide-axis') === axis)
        .some((g) => (axis === 'vertical' ? lines.vertical : lines.horizontal).some((line) => near(guidePos(g), line, TOL_GUIDE)))
    ck(
      'パンでゴースト中心が画面上で動かない(動いた分は吸着で説明できる)',
      explained(dx, 'vertical') && explained(dy, 'horizontal'),
      `Δ=${dx.toFixed(1)},${dy.toFixed(1)} ガイド=${guidesNow.length}本`
    )
  }
  checkGuides('パン後', framePan)
  // 元の位置へ戻す。以降の判定を「パンで動かした後の座標」で汚さない
  for (let i = 0; i < panSteps; i++) {
    window.dispatchEvent(new CustomEvent(EDGE_PAN_EVENT, { detail: { dx: -panDx, dy: 0 } }))
  }
  window.dispatchEvent(new Event(EDGE_PAN_END_EVENT))
  await settle()

  // ---- 10. ズームの不変条件: 倍率が変わってもゴースト中心は動かず、箱は実寸に追随する ----
  // トラックパッドピンチ(ctrlKey つき wheel)は use-viewport-input が immediateZoom へ繋ぐ即時経路。
  // 基点はゴースト中心から離した位置に置く — 中心を基点にすると、実装が壊れていても中心が動かない
  const zoomAnchor = { x: canvasRect0.left + 40, y: canvasRect0.top + 40 }
  const wheel = (deltaY) =>
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY,
        ctrlKey: true,
        clientX: zoomAnchor.x,
        clientY: zoomAnchor.y,
        bubbles: true,
        cancelable: true,
      })
    )
  const tBeforeZoom = readTransform()
  const centerBeforeZoom = centerOf(frame.getBoundingClientRect())
  // 70px = 1レベル(use-viewport-input の PINCH_PX_PER_LEVEL)。上限に張り付いていたら逆向きに倒す
  wheel(-70)
  await settle()
  let tZoom = readTransform()
  let zoomDir = -70
  if (near(tZoom.scale, tBeforeZoom.scale, 0.0001)) {
    wheel(70)
    await settle()
    tZoom = readTransform()
    zoomDir = 70
  }
  const frameZoom = frame.getBoundingClientRect()
  const centerAfterZoom = centerOf(frameZoom)
  ck(
    'ズームで倍率が変わった(検出力の裏取り)',
    !near(tZoom.scale, tBeforeZoom.scale, 0.0001),
    `scale ${tBeforeZoom.scale.toFixed(4)} → ${tZoom.scale.toFixed(4)}`
  )
  {
    const dx = centerAfterZoom.x - centerBeforeZoom.x
    const dy = centerAfterZoom.y - centerBeforeZoom.y
    const guidesNow = q('[data-ghost="guide"]')
    const lines = frameLines(frameZoom)
    const explained = (delta, axis) =>
      Math.abs(delta) <= TOL ||
      guidesNow
        .filter((g) => g.getAttribute('data-guide-axis') === axis)
        .some((g) => (axis === 'vertical' ? lines.vertical : lines.horizontal).some((line) => near(guidePos(g), line, TOL_GUIDE)))
    ck(
      'ズームでゴースト中心が画面上で動かない(動いた分は吸着で説明できる)',
      explained(dx, 'vertical') && explained(dy, 'horizontal'),
      `Δ=${dx.toFixed(1)},${dy.toFixed(1)} ガイド=${guidesNow.length}本`
    )
  }
  if (hasLogical) {
    const logicalNow = {
      x: num(frame, 'data-ghost-logical-x'),
      y: num(frame, 'data-ghost-logical-y'),
      w: num(frame, 'data-ghost-logical-w'),
      h: num(frame, 'data-ghost-logical-h'),
    }
    const wantW = Math.max(logicalNow.w * tZoom.scale, DISPLAY_MIN)
    const wantH = Math.max(logicalNow.h * tZoom.scale, DISPLAY_MIN)
    ck(
      'ズーム後も枠の画面寸法 = 論理寸法×倍率(±1px)',
      near(frameZoom.width, wantW, TOL) && near(frameZoom.height, wantH, TOL),
      `実測 ${frameZoom.width.toFixed(1)}×${frameZoom.height.toFixed(1)} / 期待 ${wantW.toFixed(1)}×${wantH.toFixed(1)} (scale=${tZoom.scale.toFixed(4)})`
    )
  } else {
    sk('ズーム後も枠の画面寸法 = 論理寸法×倍率(±1px)', 'data-ghost-logical-* が無く判定不能(同名の fail 済み)')
  }
  // 倍率を戻す。同じ基点・逆向き1レベルで元へ帰る(レベルは log2 の量子化なので可逆)
  wheel(-zoomDir)
  await settle()

  return report('ghost-placement')
})()
