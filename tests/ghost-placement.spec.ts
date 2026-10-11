// ゴースト配置セッションを実際に開き、scripts/verify-ghost.js を局面ごとに注入して受入判定する。
// 旧 scripts/run-ghost-checks.mjs を移したもの。到達手順と実測の道具は ghost.helpers.ts にある。
//
// 1シナリオ = 1テスト = 1ページ。前のシナリオの副作用(編集中のワーキングコピー・保存済みレイアウト)を
// 持ち込まない。ただし最後の「skip の消し込み」は全シナリオの注入結果を突き合わせるので、
// このファイルだけは serial にして同じワーカーで順に走らせ、結果をファイル内の配列へ貯める。
// シナリオが1本でも落ちれば後続は走らず、その時点で全体は赤になる
import { type Page } from '@playwright/test'
import {
  clickGhostCancel,
  clickGhostConfirm,
  dragGhostTo,
  findSpot,
  inject,
  openCreateFacilityGhost,
  openRepositionGhost,
  readCounts,
  waitGhostGone,
  type GhostReport,
} from './ghost.helpers'
import {
  createChecks,
  describeCheck,
  expect,
  openSeatMap,
  recordChecked,
  test,
  type Check,
} from './seatmap.helpers'

test.describe.configure({ mode: 'serial' })

type ScenarioResult = { checks: Check[]; reports: GhostReport[] }

const scenarioCreate = async (page: Page): Promise<ScenarioResult> => {
  const { checks, ck } = createChecks()
  const reports: GhostReport[] = []
  await openCreateFacilityGhost(page)

  reports.push(await inject(page, { phase: 'create/初期表示', mode: 'open' }))

  // 重なり: チーム枠の中心へ運ぶ(チーム枠は §04-4 の障害物)
  const teamCenter = await page.evaluate(() => {
    const el = document.querySelector('[data-team-id]')
    if (!el) throw new Error('チーム枠が無い')
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  await dragGhostTo(page, teamCenter)
  reports.push(await inject(page, { phase: 'create/重なり', mode: 'open', expectBlocked: true }))

  // ガイド: 障害物の辺と揃う空き位置まで運び、掴んだまま注入する
  // (離すと guides は空へ戻る実装なので、押下中でなければ出現側を網羅できない)
  const alignedSpot = await findSpot(page, { aligned: true })
  ck('吸着が起きる空き位置を探索できた', !!alignedSpot, JSON.stringify(alignedSpot))
  if (alignedSpot) {
    await dragGhostTo(page, alignedSpot, { release: false })
    reports.push(
      await inject(page, {
        phase: 'create/吸着中(掴んだまま)',
        mode: 'open',
        expectState: 'dragging',
        expectBlocked: false,
        expectGuides: 'some',
        probes: false,
      })
    )
    await page.mouse.up()
    await page.waitForTimeout(200)
  }

  // 離すとガイドは消える
  const guidesAfterRelease = await page.evaluate(
    () => document.querySelectorAll('[data-ghost="guide"]').length
  )
  ck('離すとガイド線が消える', guidesAfterRelease === 0, `${guidesAfterRelease}本`)

  // 取消: 件数も座標も変わらない
  const beforeCancel = await readCounts(page)
  await clickGhostCancel(page)
  await waitGhostGone(page)
  const afterCancel = await readCounts(page)
  ck(
    '取消でセッションが閉じ、対象の数が変わらない',
    JSON.stringify(beforeCancel) === JSON.stringify(afterCancel),
    `${JSON.stringify(beforeCancel)} → ${JSON.stringify(afterCancel)}`
  )
  reports.push(await inject(page, { phase: 'create/取消後', mode: 'closed' }))

  // 確定: 対象が1つ増える
  await openCreateFacilityGhost(page)
  const freeSpot = await findSpot(page, { aligned: false })
  ck('空き位置を探索できた', !!freeSpot, JSON.stringify(freeSpot))
  if (freeSpot) await dragGhostTo(page, freeSpot)
  const beforeConfirm = await readCounts(page)
  await clickGhostConfirm(page)
  await waitGhostGone(page)
  const afterConfirm = await readCounts(page)
  ck(
    '確定でセッションが閉じ、対象が1つ増える',
    afterConfirm.editObjects === beforeConfirm.editObjects + 1 &&
      afterConfirm.facilities === beforeConfirm.facilities + 1,
    `edit-object ${beforeConfirm.editObjects} → ${afterConfirm.editObjects} / facility ${beforeConfirm.facilities} → ${afterConfirm.facilities}`
  )
  reports.push(await inject(page, { phase: 'create/確定後', mode: 'closed' }))
  return { checks, reports }
}

const scenarioReposition = async (page: Page): Promise<ScenarioResult> => {
  const { checks, ck } = createChecks()
  const reports: GhostReport[] = []
  const ref = await openRepositionGhost(page)
  ck('掴み直しの対象を特定できた', !!ref, String(ref))

  reports.push(await inject(page, { phase: 'move/初期表示', mode: 'open' }))

  const rectOfRef = () =>
    page.evaluate(r => {
      const el = document.querySelector(`[data-edit-object="${r}"]`)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { x: b.x, y: b.y, w: b.width, h: b.height }
    }, ref)

  const beforeRect = await rectOfRef()
  const beforeCounts = await readCounts(page)
  const spot = await findSpot(page, { aligned: false })
  ck('移動先の空き位置を探索できた', !!spot, JSON.stringify(spot))
  if (spot) {
    await dragGhostTo(page, spot)
    const during = await rectOfRef()
    ck(
      '掴み直し中は実体がその場に残る(1pxも動かない)',
      !!during &&
        !!beforeRect &&
        Math.abs(during.x - beforeRect.x) <= 1 &&
        Math.abs(during.y - beforeRect.y) <= 1,
      `${JSON.stringify(beforeRect)} → ${JSON.stringify(during)}`
    )
    // 空き位置へ運んだ直後だけ「リサイズ可能で重なっていない」局面になる。
    // ここで注入しないと、リサイズハンドルの属性検査がどの局面でも実測されず skip のまま残る
    reports.push(
      await inject(page, {
        phase: 'move/空き位置(リサイズ可能)',
        mode: 'open',
        expectBlocked: false,
        probes: false,
      })
    )
    await clickGhostConfirm(page)
    await waitGhostGone(page)
    const afterRect = await rectOfRef()
    const afterCounts = await readCounts(page)
    const moved =
      afterRect && beforeRect
        ? Math.hypot(afterRect.x - beforeRect.x, afterRect.y - beforeRect.y)
        : 0
    ck('確定でセッションが閉じ、対象の座標が変わる', moved > 4, `移動量 ${moved.toFixed(1)}px`)
    ck(
      '掴み直しの確定で対象の数は増えない',
      afterCounts.editObjects === beforeCounts.editObjects,
      `${beforeCounts.editObjects} → ${afterCounts.editObjects}`
    )
    reports.push(await inject(page, { phase: 'move/確定後', mode: 'closed' }))
  }
  return { checks, reports }
}

const scenarioSessionExit = async (page: Page): Promise<ScenarioResult> => {
  const { checks, ck } = createChecks()
  const reports: GhostReport[] = []
  await openCreateFacilityGhost(page)
  reports.push(await inject(page, { phase: 'exit/配置中', mode: 'open' }))
  await page.getByRole('button', { name: '編集を終了' }).click()
  await page.waitForTimeout(400)
  const leftovers = await page.evaluate(() => ({
    ghost: document.querySelectorAll('[aria-label="配置プレビュー（ドラッグで移動）"]').length,
    layer: document.querySelectorAll('[data-ghost="layer"]').length,
    badge: document.querySelectorAll('[data-edit-mode-badge="true"]').length,
  }))
  ck(
    '編集セッションを終了するとゴーストも編集バッジも同時に消える',
    leftovers.ghost === 0 && leftovers.layer === 0 && leftovers.badge === 0,
    JSON.stringify(leftovers)
  )
  reports.push(await inject(page, { phase: 'exit/終了後', mode: 'closed' }))
  return { checks, reports }
}

const SCENARIOS = [
  { label: '新規配置(施設)', run: scenarioCreate },
  { label: '掴み直し(施設)', run: scenarioReposition },
  { label: '配置中のセッション終了', run: scenarioSessionExit },
]

// 各シナリオの注入結果。最後のテストが skip の消し込みに使う
const collected: GhostReport[][] = []

for (const { label, run } of SCENARIOS) {
  test(`ゴースト配置: ${label}`, async ({ page }) => {
    await openSeatMap(page)
    const { checks, reports } = await run(page)
    collected.push(reports)

    recordChecked(checks.length + reports.reduce((sum, r) => sum + r.checked, 0))
    const failures = [
      ...checks.filter(c => !c.ok).map(c => `運転台: ${describeCheck(c)}`),
      ...reports.flatMap(r => r.fail.map(f => `[${r.phase}] ${f}`)),
      // 検査0件で FAIL を返した注入(前提不成立で打ち切った回)も1件の失敗として数える。
      // fail 配列が空だからと素通りさせない
      ...reports
        .filter(r => r.verdict !== 'PASS' && r.fail.length === 0)
        .map(r => `[${r.phase}] 検査${r.checked}件で ${r.verdict}`),
    ]
    expect(failures).toEqual([])
  })
}

// skip の消し込み: ある局面で skip になった判定は、別の局面で pass していなければならない。
// 消し込めない skip = その項目は一度も実測されていない = 全体は赤
test('どの局面でも実測されなかった skip が残らない', () => {
  // 単独で走らせると貯まった結果が無く、何も突き合わせずに緑になるので落とす
  expect(collected, '全シナリオの注入結果がそろっていない').toHaveLength(SCENARIOS.length)
  const nameOf = (entry: string) => entry.split(' — ')[0]
  const reports = collected.flat()
  const passedNames = new Set(reports.flatMap(r => r.pass.map(nameOf)))
  const skippedNames = new Set(reports.flatMap(r => r.skip.map(nameOf)))
  expect([...skippedNames].filter(n => !passedNames.has(n))).toEqual([])
})
