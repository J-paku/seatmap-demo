// オフスクリーンチームインジケーターの受入検証。全チームエリアが画面外に出た時だけ端に出る
// 「最近傍チームへ移動」ボタンを、実ブラウザで確かめる。旧 scripts/verify-offscreen-indicator.mjs を移したもの。
// 検出力の確認方法: use-offscreen-team-indicator.ts の aisle 除外行を消して再ビルドすると
// 通路のみの位置のテストが落ちる
import { type Page } from '@playwright/test'
import {
  CANVAS_LAYER,
  createChecks,
  describeCheck,
  expect,
  openSeatMap,
  recordChecked,
  test,
  type Check,
} from './seatmap.helpers'

// mocks の実測値。通路だけが見える位置を作るのに使う
const AISLE = { x: 1020, y: 6, w: 60, h: 1108 }
const MEETING_BAND = { left: 1080, right: 1330, top: 15, bottom: 1099 }
// 論理座標 x[750,1070] y[900,1125] は通路のみを含む(チーム x30..1020 / 会議室 x1080.. の隙間)
const AISLE_ONLY_CENTER = { x: (750 + 1070) / 2, y: (900 + 1125) / 2 }

const INDICATOR = 'button[aria-label^="チーム "][aria-label$=" へ移動"]'

// 判定を全部下してから、落ちたものをまとめて出す(移す前と同じく途中で打ち切らない)
const expectAllPass = (checks: Check[]): void => {
  recordChecked(checks.length)
  expect(checks.filter(c => !c.ok).map(describeCheck)).toEqual([])
}

// 変換レイヤーの transform 行列から現在の論理ビューポートを実測する
const readViewport = (page: Page) =>
  page.evaluate(sel => {
    const layer = document.querySelector(sel)
    if (!layer?.parentElement) throw new Error('変換レイヤーが無い')
    const m = new DOMMatrixReadOnly(getComputedStyle(layer).transform)
    const r = layer.parentElement.getBoundingClientRect()
    return { scale: m.a, tx: m.e, ty: m.f, cw: r.width, ch: r.height }
  }, CANVAS_LAYER)

const drag = async (page: Page, dx: number, dy: number): Promise<void> => {
  await page.mouse.move(640, 450)
  await page.mouse.down()
  await page.mouse.move(640 + dx / 2, 450 + dy / 2, { steps: 6 })
  await page.mouse.move(640 + dx, 450 + dy, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(150)
}

test('全チームが画面外のときだけ出て、押すとチームへ戻る', async ({ page, pageErrors }) => {
  const { checks, ck } = createChecks()
  await openSeatMap(page)

  ck('初期表示ではインジケーターが出ない', (await page.$(INDICATOR)) === null)

  let appeared = false
  for (let i = 0; i < 14 && !appeared; i++) {
    await drag(page, -560, -360)
    appeared = (await page.$(INDICATOR)) !== null
  }
  ck('全チームが画面外でインジケーターが出る', appeared, appeared ? '' : 'パン14回で出ず')

  if (appeared) {
    const info = await page.evaluate(
      ({ sel, layerSel }) => {
        const btn = document.querySelector(sel)
        const layer = document.querySelector(layerSel)
        if (!btn || !layer) throw new Error('インジケーターか変換レイヤーが無い')
        const r = btn.getBoundingClientRect()
        const cells = [...(btn.firstElementChild?.children ?? [])]
        const label = cells.find(el => (el.textContent ?? '').trim().length > 0)
        const z = document.querySelector('[data-coach="zoom-controls"]')?.getBoundingClientRect()
        return {
          ariaLabel: btn.getAttribute('aria-label') ?? '',
          inViewport:
            r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
          insideTransformLayer: layer.contains(btn),
          zIndex: getComputedStyle(btn).zIndex,
          labelBg: label ? getComputedStyle(label).backgroundColor : null,
          svgHidden: btn.querySelector('svg')?.getAttribute('aria-hidden'),
          overlapsZoomControls: z
            ? r.left < z.right && r.right > z.left && r.top < z.bottom && r.bottom > z.top
            : false,
          teamsOnScreen: [...document.querySelectorAll('[data-team-id]')].filter(t => {
            const b = t.getBoundingClientRect()
            return b.right > 0 && b.left < innerWidth && b.bottom > 0 && b.top < innerHeight
          }).length,
        }
      },
      { sel: INDICATOR, layerSel: CANVAS_LAYER }
    )

    ck('aria-label が仕様どおり', /^チーム .+ へ移動$/.test(info.ariaLabel), info.ariaLabel)
    ck('変換レイヤーの外にある(画面固定)', info.insideTransformLayer === false)
    ck('ビューポート内に収まっている', info.inViewport)
    ck('z-index が --z-index-sticky(200)', info.zIndex === '200', info.zIndex)
    ck('SVG が aria-hidden', info.svgHidden === 'true', String(info.svgHidden))
    ck('ラベルがチーム色地', /^rgb/.test(info.labelBg || ''), String(info.labelBg))
    ck('ズームコントロールと重ならない', info.overlapsZoomControls === false)
    ck('出現時にチーム箱が画面内に無い', info.teamsOnScreen === 0, `${info.teamsOnScreen}件`)

    await page.click(INDICATOR)
    await page.waitForTimeout(900)
    const after = await page.evaluate(sel => {
      return {
        indicator: document.querySelector(sel) !== null,
        teamsOnScreen: [...document.querySelectorAll('[data-team-id]')].filter(t => {
          const b = t.getBoundingClientRect()
          return b.right > 0 && b.left < innerWidth && b.bottom > 0 && b.top < innerHeight
        }).length,
        live: [...document.querySelectorAll('[aria-live]')]
          .map(el => el.textContent || '')
          .join(' | '),
      }
    }, INDICATOR)

    ck('クリックでチームが画面内に戻る', after.teamsOnScreen > 0, `${after.teamsOnScreen}件`)
    ck('移動後にインジケーターが消える', after.indicator === false)
    ck('移動アナウンスが LiveRegion に出る', /チーム .+ へ移動しました/.test(after.live))
  }

  ck('ページエラーが無い', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
  expectAllPass(checks)
})

// 決定 D3: 通路(aisle)は抑止条件から除外する。通路だけが見える位置でも出る
test('通路だけが見える位置でもインジケーターが出る', async ({ page }) => {
  const { checks, ck } = createChecks()
  await openSeatMap(page)

  for (let i = 0; i < 8; i++) {
    const v = await readViewport(page)
    if (v.scale >= 3.9) break
    await page.click('button[aria-label="拡大"]')
    await page.waitForTimeout(260)
  }

  for (let i = 0; i < 24; i++) {
    const v = await readViewport(page)
    const curX = (v.cw / 2 - v.tx) / v.scale
    const curY = (v.ch / 2 - v.ty) / v.scale
    const needX = (AISLE_ONLY_CENTER.x - curX) * v.scale
    const needY = (AISLE_ONLY_CENTER.y - curY) * v.scale
    if (Math.abs(needX) < 6 && Math.abs(needY) < 6) break
    const clampPx = (n: number) => Math.max(-500, Math.min(500, n))
    await drag(page, clampPx(-needX), clampPx(-needY))
  }

  const state = await page.evaluate(
    ({ sel, layerSel }) => {
      const layer = document.querySelector(layerSel)
      if (!layer?.parentElement) throw new Error('変換レイヤーが無い')
      const m = new DOMMatrixReadOnly(getComputedStyle(layer).transform)
      const r = layer.parentElement.getBoundingClientRect()
      return {
        vp: {
          left: -m.e / m.a,
          top: -m.f / m.a,
          right: (r.width - m.e) / m.a,
          bottom: (r.height - m.f) / m.a,
        },
        teamsOnScreen: [...document.querySelectorAll('[data-team-id]')].filter(t => {
          const b = t.getBoundingClientRect()
          return b.right > 0 && b.left < innerWidth && b.bottom > 0 && b.top < innerHeight
        }).length,
        indicator: document.querySelector(sel) !== null,
      }
    },
    { sel: INDICATOR, layerSel: CANVAS_LAYER }
  )

  // 「通路だけが見えている」状態を作れたことを先に実測してから本判定に入る
  const vp = state.vp
  const aisleVisible =
    AISLE.x < vp.right &&
    AISLE.x + AISLE.w > vp.left &&
    AISLE.y < vp.bottom &&
    AISLE.y + AISLE.h > vp.top
  const meetingVisible =
    MEETING_BAND.left < vp.right &&
    MEETING_BAND.right > vp.left &&
    MEETING_BAND.top < vp.bottom &&
    MEETING_BAND.bottom > vp.top

  ck('通路がビューポート内にある', aisleVisible, JSON.stringify(vp))
  ck('会議室がビューポート外', !meetingVisible)
  ck('チーム箱がビューポート外', state.teamsOnScreen === 0, `${state.teamsOnScreen}件`)
  ck('通路のみ見える位置でもインジケーターが出る(D3)', state.indicator)
  expectAllPass(checks)
})
