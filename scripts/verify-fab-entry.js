// verify-fab-entry.js — 左下FABと3シート(オブジェクト分類・家具ピッカー・施設ピッカー)の受入判定。
// verify-s1.js と同じ注入型スクリプトで、実行中の画面へ丸ごと貼ると
// { verdict, checked, pass, fail, skip } を返す。
//
// 【この検証を直す前に読むこと】スクリプトを通すためにスクリプトを直さない。
// 落ちた判定は実装かフック(data 属性)の不足を指す。判定の閾値・セレクタ・期待値を緩めて
// PASS にする変更は禁止する。検査0件は PASS ではなく FAIL として扱う。
//
// 判定に操作が要る項目は、このスクリプト自身が実入力と同じ経路で操作する
// (click() / 長押しは pointerdown → 500ms → pointerup / キーは KeyboardEvent)。
// 幅に依存する項目(ボトムシート形状)だけは注入側から変えられないので、
// 640px 以上の画面では skip する。必須集合に skip が出た場合は verdict を "PARTIAL" にする —
// 全項目 skip で PASS になる形にはしない。
//
// 戻り値は Promise。Playwright は await page.evaluate(src)、DevTools は最後の console.log を見る。
;(async () => {
  const pass = []
  const fail = []
  const skip = []
  const ck = (name, ok, detail) => (ok ? pass : fail).push(name + (detail ? ` — ${detail}` : ''))
  const sk = (name, detail) => skip.push(name + (detail ? ` — ${detail}` : ''))

  // 無操作の前提が要らない = どの環境でも必ず判定できるべき項目。
  // ここに skip が出たらハーネスが仕事をしていないので PARTIAL へ落とす
  const REQUIRED = [
    'A1: FABが aria-haspopup=menu を持つ',
    'A2: メニュー展開中だけ背景膜と data-fab-open=true が立つ',
    'A6: シート展開中は body の overflow が hidden',
    'A7: 暗幕の wheel は preventDefault される(パネル内はされない)',
    'A9: 家具ピッカーだけがガラス材(blur 28px + saturate 170%)',
    'A10: 3シートとも button[aria-label="閉じる"] がちょうど1件',
    'A14: 施設一覧の配置済み行が全角括弧つき + disabled',
  ]

  const COMPACT_MAX_WIDTH = 639
  const LONG_PRESS_MS = 500

  const report = () => {
    const checked = pass.length + fail.length
    const nameOf = (entry) => entry.split(' — ')[0]
    const judged = new Set([...pass, ...fail].map(nameOf))
    const skippedNames = new Set(skip.map(nameOf))
    const missing = REQUIRED.filter((name) => !judged.has(name) || skippedNames.has(name))
    const verdict = checked === 0 || fail.length > 0 ? 'FAIL' : missing.length > 0 ? 'PARTIAL' : 'PASS'
    const out = { verdict, checked, pass, fail, skip, missingRequired: missing }
    console.log(JSON.stringify(out, null, 1))
    return out
  }

  const q = (sel, root) => [...(root || document).querySelectorAll(sel)]
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const raf = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const settle = async () => {
    await raf()
    await sleep(80)
    await raf()
  }
  const waitFor = async (fn, ms = 2000) => {
    const until = performance.now() + ms
    for (;;) {
      const v = fn()
      if (v) return v
      if (performance.now() > until) return null
      await sleep(50)
    }
  }
  const fab = () => document.querySelector('[data-coach="admin-fab"]')
  const pressEsc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))

  // ---- 0. 前提 ----
  if (!fab()) {
    fail.push('前提: 左下FAB([data-coach="admin-fab"])が見つからない — 閲覧モードの初期画面で実行すること')
    return report()
  }
  const isCompact = window.innerWidth <= COMPACT_MAX_WIDTH
  // 背面ロックの基準値。FABのメニュー自体もロックを取るので、何も開いていない今のうちに読む
  const bodyOverflowBefore = document.body.style.overflow

  // haptic の観測。§05-5 の触覚は window の 'haptic' イベントで飛ぶ
  const haptics = []
  const onHaptic = (e) => haptics.push(e.detail)
  window.addEventListener('haptic', onHaptic)

  // ---- R1 / A1 / A2: FABの名前・haspopup・背景膜 ----
  ck('A1: FABが aria-haspopup=menu を持つ', fab().getAttribute('aria-haspopup') === 'menu', fab().getAttribute('aria-haspopup'))
  const closedLabel = fab().getAttribute('aria-label')
  const closedBackdrop = q('[data-fab-backdrop]').length
  const closedOpenAttr = document.querySelector('[data-fab-open]')?.getAttribute('data-fab-open')
  fab().click()
  await settle()
  const menu = await waitFor(() => document.querySelector('[data-fab-menu]'))
  const openLabel = fab().getAttribute('aria-label')
  ck(
    'R1: FABの aria-label が開閉で変化する',
    closedLabel === '追加メニューを開く' && openLabel === '追加メニューを閉じる',
    `${closedLabel} / ${openLabel}`
  )
  ck(
    'A2: メニュー展開中だけ背景膜と data-fab-open=true が立つ',
    closedBackdrop === 0 &&
      closedOpenAttr === 'false' &&
      q('[data-fab-backdrop]').length === 1 &&
      document.querySelector('[data-fab-open]')?.getAttribute('data-fab-open') === 'true',
    `閉:${closedBackdrop}/${closedOpenAttr} 開:${q('[data-fab-backdrop]').length}/${document.querySelector('[data-fab-open]')?.getAttribute('data-fab-open')}`
  )

  // ---- R5: メニュー項目の並び・スタッガ ----
  if (menu) {
    const items = q('[role="menuitem"]', menu)
    // 行はアイコン span とラベル span を持つ。行全体の textContent を読むと
    // リガチャ文字("groups" など)が混ざるので、ラベル側(最後の span)だけを読む
    const texts = items.map((el) => {
      const spans = [...el.querySelectorAll('span')].filter((sp) => !sp.hasAttribute('aria-hidden'))
      return (spans[0] ?? el).textContent.trim()
    })
    const keys = items.map((el) => el.getAttribute('data-fab-item'))
    const stagger = items.map((el) => getComputedStyle(el).getPropertyValue('--glass-stagger-i').trim())
    const delays = items.map((el) => Math.round(parseFloat(getComputedStyle(el).animationDelay) * 1000))
    ck(
      'R5: メニュー3項目の並び・data-fab-item・スタッガ反転が保たれている',
      items.length === 3 &&
        texts.join(',') === 'チーム,設備,レイアウトを編集' &&
        keys.join(',') === 'team,facility,edit' &&
        stagger.join(',') === '2,1,0' &&
        delays.join(',') === '90,45,0',
      `${items.length}件 ${texts.join('/')} ${keys.join('/')} stagger=${stagger.join('/')} delay=${delays.join('/')}`
    )

    // ---- R3: ロービングタブと焦点復帰 ----
    const firstFocused = document.activeElement === items[0]
    key(menu, 'ArrowDown')
    await raf()
    const secondFocused = document.activeElement === items[1]
    items[0].focus()
    key(menu, 'ArrowUp')
    await raf()
    const wrapped = document.activeElement === items[2]
    pressEsc()
    await settle()
    const backToFab = document.activeElement === fab()
    ck(
      'R3: 開いたら先頭へ・↑↓で巡回・閉じたらFABへ焦点が戻る',
      firstFocused && secondFocused && wrapped && backToFab,
      `先頭=${firstFocused} 次=${secondFocused} 回り込み=${wrapped} 復帰=${backToFab}`
    )
  } else {
    fail.push('R5: メニュー3項目の並び・data-fab-item・スタッガ反転が保たれている — メニューが開かない')
    fail.push('R3: 開いたら先頭へ・↑↓で巡回・閉じたらFABへ焦点が戻る — メニューが開かない')
  }

  // ---- A6 / A7 / A9 / A10 / A13: 分類シートと家具ピッカー ----
  fab().click()
  await settle()
  const facilityRow = q('[data-fab-item="facility"]')[0]
  facilityRow.click()
  await settle()
  const categorySheet = await waitFor(() =>
    document.querySelector('[role="dialog"][aria-modal="true"][aria-label="オブジェクトを追加"]')
  )
  ck('前提: 分類シートが開く', !!categorySheet)
  if (!categorySheet) {
    window.removeEventListener('haptic', onHaptic)
    return report()
  }
  ck(
    'A6: シート展開中は body の overflow が hidden',
    document.body.style.overflow === 'hidden',
    `開く前="${bodyOverflowBefore}" 開いた後="${document.body.style.overflow}"`
  )

  {
    const backdrop = document.querySelector('[data-picker-backdrop]')
    const inner = categorySheet
    const onBackdrop = new WheelEvent('wheel', { cancelable: true, bubbles: false })
    backdrop.dispatchEvent(onBackdrop)
    const onPanel = new WheelEvent('wheel', { cancelable: true, bubbles: false })
    inner.dispatchEvent(onPanel)
    ck(
      'A7: 暗幕の wheel は preventDefault される(パネル内はされない)',
      onBackdrop.defaultPrevented === true && onPanel.defaultPrevented === false,
      `暗幕=${onBackdrop.defaultPrevented} パネル=${onPanel.defaultPrevented}`
    )
  }

  const categoryPanel = categorySheet.parentElement
  const closeCountCategory = q('button[aria-label="閉じる"]', categorySheet).length
  const categoryFilter = getComputedStyle(categoryPanel).backdropFilter

  // 分類シートのカード → 家具ピッカーへ(A13 の medium もここで観測する)
  haptics.length = 0
  const furnitureCard = q('button', categorySheet).find((b) => b.textContent.includes('家具'))
  ck('前提: 分類シートに家具カードがある', !!furnitureCard)
  furnitureCard?.click()
  await settle()
  const furnitureSheet = await waitFor(() =>
    document.querySelector('[role="dialog"][aria-modal="true"][aria-label="家具を選択"]')
  )
  ck('前提: 家具ピッカーが開く', !!furnitureSheet)
  const cardHaptic = haptics[0]
  const furniturePanel = furnitureSheet ? furnitureSheet.parentElement : null
  const furnitureFilter = furniturePanel ? getComputedStyle(furniturePanel).backdropFilter : ''
  const closeCountFurniture = furnitureSheet ? q('button[aria-label="閉じる"]', furnitureSheet).length : -1
  ck(
    'A9: 家具ピッカーだけがガラス材(blur 28px + saturate 170%)',
    /blur\(28px\)/.test(furnitureFilter) &&
      /saturate\(1\.7\)|saturate\(170%\)/.test(furnitureFilter) &&
      !/blur\(28px\)/.test(categoryFilter),
    `家具="${furnitureFilter}" 分類="${categoryFilter}"`
  )

  // R4 / A8: ボトムシート形状は幅に依存する
  if (furnitureSheet && isCompact) {
    const grabber = document.querySelector('[data-sheet-grabber]')
    const panelRect = furniturePanel.getBoundingClientRect()
    ck(
      'R4: コンパクト幅で家具ピッカーがボトムシート(つまみ1件・画面下端に接する)',
      !!grabber && Math.abs(panelRect.bottom - window.innerHeight) <= 2,
      `つまみ=${grabber ? 1 : 0} bottom=${panelRect.bottom.toFixed(1)} / ${window.innerHeight}`
    )
    const gr = grabber.getBoundingClientRect()
    const bar = getComputedStyle(grabber, '::before')
    ck(
      'A8: つまみが高さ48pxで内部バーが40x4px',
      Math.abs(gr.height - 48) <= 1 && bar.width === '40px' && bar.height === '4px',
      `${gr.height.toFixed(1)}px / ${bar.width}×${bar.height}`
    )
  } else {
    sk('R4: コンパクト幅で家具ピッカーがボトムシート(つまみ1件・画面下端に接する)', `幅${window.innerWidth}px は中央モーダル帯`)
    sk('A8: つまみが高さ48pxで内部バーが40x4px', `幅${window.innerWidth}px ではつまみを出さない`)
  }

  // シートの × を押す(A13 の light をここで観測)
  haptics.length = 0
  const closeBtn = furnitureSheet ? q('button[aria-label="閉じる"]', furnitureSheet)[0] : null
  closeBtn?.click()
  await settle()
  const closeHaptic = haptics[0]
  ck(
    'A13: 分類カードは medium・シートの×は light の触覚が飛ぶ',
    cardHaptic === 'medium' && closeHaptic === 'light',
    `カード=${cardHaptic} ×=${closeHaptic}`
  )
  ck(
    'A6-2: 全て閉じると body の overflow が元へ戻る',
    document.body.style.overflow === bodyOverflowBefore,
    `"${document.body.style.overflow}" / 期待 "${bodyOverflowBefore}"`
  )

  // ---- A10 / A11 / A12 / A14: 施設ピッカー ----
  fab().click()
  await settle()
  q('[data-fab-item="facility"]')[0].click()
  await settle()
  const sheet2 = await waitFor(() =>
    document.querySelector('[role="dialog"][aria-modal="true"][aria-label="オブジェクトを追加"]')
  )
  const facilityCard = sheet2 ? q('button', sheet2).find((b) => b.textContent.includes('施設')) : null
  facilityCard?.click()
  await settle()
  const facilitySheet = await waitFor(() =>
    document.querySelector('[role="dialog"][aria-modal="true"][aria-label="施設を選択"]')
  )
  ck('前提: 施設ピッカーが開く', !!facilitySheet)
  if (facilitySheet) {
    const input = facilitySheet.querySelector('input[aria-label="施設名で検索"]')
    ck('A11: 施設ピッカーを開いた直後は検索欄へ焦点が入る', document.activeElement === input, String(document.activeElement?.tagName))
    ck(
      'A10: 3シートとも button[aria-label="閉じる"] がちょうど1件',
      closeCountCategory === 1 && closeCountFurniture === 1 && q('button[aria-label="閉じる"]', facilitySheet).length === 1,
      `分類=${closeCountCategory} 家具=${closeCountFurniture} 施設=${q('button[aria-label="閉じる"]', facilitySheet).length}`
    )
    ck(
      'A14: 施設一覧の配置済み行が全角括弧つき + disabled',
      q('button[aria-label$="（配置済み）"][disabled]', facilitySheet).length > 0,
      `${q('button[aria-label$="（配置済み）"][disabled]', facilitySheet).length}件`
    )

    // A12: 1文字入力 → クリアボタン
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, '会')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()
    const clear = document.querySelector('[data-facility-search-clear]')
    const clearRect = clear ? clear.getBoundingClientRect() : null
    clear?.click()
    await settle()
    ck(
      'A12: クリアボタンが32x44pxで、押すと入力が空・シートは開いたまま・焦点が入力欄へ戻る',
      !!clearRect &&
        Math.abs(clearRect.width - 32) <= 1 &&
        Math.abs(clearRect.height - 44) <= 1 &&
        input.value === '' &&
        !!document.querySelector('[role="dialog"][aria-label="施設を選択"]') &&
        document.activeElement === input,
      clearRect ? `${clearRect.width.toFixed(1)}×${clearRect.height.toFixed(1)} value="${input.value}"` : 'クリアボタンが出ない'
    )
    q('button[aria-label="閉じる"]', facilitySheet)[0]?.click()
    await settle()
  } else {
    fail.push('A10: 3シートとも button[aria-label="閉じる"] がちょうど1件 — 施設ピッカーが開かない')
    fail.push('A11: 施設ピッカーを開いた直後は検索欄へ焦点が入る — 施設ピッカーが開かない')
    fail.push('A12: クリアボタンが32x44pxで、押すと入力が空・シートは開いたまま・焦点が入力欄へ戻る — 施設ピッカーが開かない')
    fail.push('A14: 施設一覧の配置済み行が全角括弧つき + disabled — 施設ピッカーが開かない')
  }

  // ---- R2: 長押しで編集セッションへ直行し、メニューは開かない ----
  {
    const target = fab()
    const rect = target.getBoundingClientRect()
    const opts = {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
      cancelable: true,
    }
    target.dispatchEvent(new PointerEvent('pointerdown', opts))
    await sleep(LONG_PRESS_MS + 120)
    target.dispatchEvent(new PointerEvent('pointerup', opts))
    // React の onClick は pointerup の後の click で走る。実ブラウザと同じ順序を再現する
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await settle()
    const badge = document.querySelector('[data-edit-mode-badge="true"]')
    ck(
      'R2: 500ms長押しで編集セッションへ入り、メニューは開かない(長押し後のclickを消費)',
      !!badge && q('[data-fab-menu]').length === 0,
      `編集バッジ=${!!badge} メニュー=${q('[data-fab-menu]').length}件`
    )
  }

  // ---- A3: 座席を選ぶとFABが消える ----
  {
    const seatButtons = q('[role="group"][aria-label="座席一覧"] button')
    if (seatButtons.length >= 2 && document.querySelector('[data-edit-mode-badge="true"]')) {
      seatButtons[0].click()
      await settle()
      const afterOne = q('[data-coach="admin-fab"]').length
      seatButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }))
      await settle()
      const afterTwo = q('[data-coach="admin-fab"]').length
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await settle()
      const afterClear = q('[data-coach="admin-fab"]').length
      ck(
        'A3: 座席を1席/2席選ぶとFABが消え、解除で戻る',
        afterOne === 0 && afterTwo === 0 && afterClear === 1,
        `1席=${afterOne} 2席=${afterTwo} 解除=${afterClear}`
      )
    } else {
      sk('A3: 座席を1席/2席選ぶとFABが消え、解除で戻る', '編集セッションまたは座席ミラーへ到達できていない')
    }
  }

  // A4 / A5 はツアー既読キーの削除と再読み込みが前提。注入側からは再現できないので運転台の責務
  sk('A4: ツアー既読キーを消した直後でもガイド層は常に1枚以下', '既読キーの削除と再読み込みが必要(運転台側で実施する)')
  sk('A5: 抑止は1回限りで、入り直せば編集ガイドが自動再生される', '同上')

  window.removeEventListener('haptic', onHaptic)
  return report()
})()
