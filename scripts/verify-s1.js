// verify-s1.js — S1 完了判定。実行中の画面(ローカル / Pages 両方)で走らせる
;(() => {
  const pass = [], fail = []
  const ck = (name, ok, detail) => (ok ? pass : fail).push(name + (detail ? ` — ${detail}` : ''))

  const layer = document.querySelector('[data-canvas-transform-layer="true"]')
  ck('transform レイヤーが存在', !!layer)
  const canvasText = layer ? layer.innerText : ''

  // 1. キャンバスに個人座席カードが無い(在席状態語が出たら座席カードを描いている)
  const seatWords = ['在席', '空席', '会議中', '外出', 'リモート', '出張', '退勤', '休み']
  const hit = seatWords.filter(w => canvasText.includes(w))
  ck('キャンバスに個人座席カードが無い', hit.length === 0, hit.join(','))

  // 2. sr-only ミラーレイヤーに座席ボタンがある
  const mirror = [...document.querySelectorAll('.sr-only')].find(el => el.querySelector('button'))
  const mirrorBtns = mirror ? mirror.querySelectorAll('button').length : 0
  ck('sr-only 座席ミラーが存在', mirrorBtns > 0, `${mirrorBtns}件`)

  // 3. チーム箱がクリックを直接受ける(手前を何かが覆っていない)
  const teams = [...document.querySelectorAll('[data-team-id]')]
  ck('チーム箱が存在', teams.length > 0, `${teams.length}件`)
  let blocked = 0, skipped = 0
  for (const t of teams) {
    const b = t.getBoundingClientRect()
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) { skipped++; continue }
    const top = document.elementFromPoint(cx, cy)
    if (!(top === t || t.contains(top))) blocked++
  }
  ck('チーム箱がクリックを直接受ける', blocked === 0, `覆われ${blocked} / 画面外${skipped}`)

  // 4. チーム箱同士が重ならない
  const rs = teams.map(t => t.getBoundingClientRect())
  let ov = 0
  for (let i = 0; i < rs.length; i++)
    for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i], b = rs[j]
      if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) ov++
    }
  ck('チーム箱が重ならない', ov === 0, `${ov}組`)

  // 5. 通路点線ラベル
  ck('通路ラベルが存在', canvasText.includes('通路'))

  // 6. 初期倍率 <= 0.65
  const m = layer && getComputedStyle(layer).transform.match(/matrix\(([-\d.]+)/)
  const scale = m ? parseFloat(m[1]) : null
  ck('初期倍率 <= 0.65', scale !== null && scale <= 0.651, `scale=${scale}`)

  // 7. チームラベルの N名 表記
  ck('チームラベルに N名', /\d+名/.test(canvasText))

  // 8. 会議室が描かれている
  ck('会議室が存在', document.querySelectorAll('[data-facility="true"]').length > 0)

  const report = { verdict: fail.length === 0 ? 'PASS' : 'FAIL', pass, fail }
  console.log(JSON.stringify(report, null, 1))
  return report
})()
