// 座席マップ画面(コンテナ)の統合テスト(Vitest Browser Mode)。画面を実際の Chromium で、フック・子と一緒に描き、
// 利用者に見える形(role・名前・文字・aria-*)と固定の DOM フック(data-team-id。CLAUDE.md 不変ルール4)で確かめる。
// 包む Provider は配信物と同じ木にする: _app.tsx の LayoutSourceProvider と、pages/index.tsx のログイン後の4つ。
// ログインゲートと <Head> はこの画面の外(pages/index.tsx)なので描かない。
// モジュールは差し替えない。localStorage は本物を使い、各テストの前に空にする(初めて訪れた利用者の状態から始める)。
// 操作は user-event で利用者と同じ順に押し、画面が変わるのを Testing Library の waitFor・findBy* で待つ
// (React の act の環境を切っている理由は vitest.integration.setup.ts)
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { SWRConfig } from 'swr'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
// ページのルーター(pages router)が useRouter へ値を配る文脈。ヘッダー(AppHeader)が useRouter で basePath を読む。
// 公開の入口が無いので、next/router が読むのと同じモジュールを直に指す(別のモジュールなら別の文脈になり、値が届かない)
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime'
import mitt from 'next/dist/shared/lib/mitt'
import type { NextRouter } from 'next/router'
import '@/styles/globals.css'
import { EDIT_TOUR_STORAGE_KEY } from '@/components/CoachMarkTour/utils/tour-steps'
import { buildTeamSelector } from '@/components/SeatMapCanvas/utils/build-team-selector'
import { AnnouncementProvider } from '@/contexts/announcement-context'
import { AvatarsProvider } from '@/contexts/avatars-context'
import { DetailPanelProvider } from '@/contexts/detail-panel-context'
import { LayoutSourceProvider } from '@/contexts/layout-source-context'
import { SelectedDateProvider } from '@/contexts/selected-date-context'
import { loadCustomLayout, saveCustomLayout, saveLayoutMetas } from '@/lib/layout-persistence'
import { FLOOR_SEEDS, VIEWBOX } from '@/lib/mock-loader'
import { markSeen } from '@/lib/persist-tour-seen'
import { VALID_EMPLOYEE_IDS } from '@/utils/collect-employee-ids'
import { DEFAULT_FLOOR_ID } from '@/utils/floors'
import { TOAST_MESSAGES } from '@/utils/toast-messages'
import type { SeatLayout } from '@/types'
import { MAIN_TOUR_STORAGE_KEY } from './utils/main-tour-steps'
import { TOAST_MS } from './utils/save-layout-constants'
import { SeatMapView } from './container'

// 既定のフロア(本社1F。utils/floors.ts の DEFAULT_FLOOR_ID)の種データ。
// チーム箱のインタラクション面は data-team-id に Team.idPrefix を持つ(components/TeamArea.tsx)
const DEFAULT_FLOOR_SEED = FLOOR_SEEDS[DEFAULT_FLOOR_ID]
const DEFAULT_FLOOR_TEAMS = DEFAULT_FLOOR_SEED.teams

// モックの取得は 200〜500ms(lib/mock-loader.ts の responseDelay)、保存は 400ms(utils/save-delay.ts)遅れて返る。
// 画面がそれを映すまで待つ上限
const WAIT = { timeout: 5_000 }

const NO_NAVIGATION = 'テストでは画面を移らない'
const refuseNavigation = (): Promise<boolean> => Promise.reject(new Error(NO_NAVIGATION))
const refuseHistory = (): void => {
  throw new Error(NO_NAVIGATION)
}

// 配信物の / を開いたときのルーターの値。basePath は GitHub Pages の配信(GITHUB_PAGES=true)でだけ付くので、
// 手元の既定(next.config.mjs)と同じ空にする。移動の呼び出しは、呼ばれたら分かるよう例外にする
const pagesRouter: NextRouter = {
  route: '/',
  pathname: '/',
  query: {},
  asPath: '/',
  basePath: '',
  isLocaleDomain: false,
  isFallback: false,
  isReady: true,
  isPreview: false,
  events: mitt(),
  push: refuseNavigation,
  replace: refuseNavigation,
  reload: refuseHistory,
  back: refuseHistory,
  forward: refuseHistory,
  prefetch: () => Promise.resolve(),
  beforePopState: () => undefined,
}

// 配信物の木(_app.tsx → pages/index.tsx のログイン後)と同じ順に包んで描く。
// SWR の覚え(キャッシュ)は描くたびに新しくする。既定の覚えはモジュールに1つだけあり、同じファイルの前のテストで
// 取ったデータや保存したレイアウトが残ると、localStorage を空にしても初めて訪れた状態にならないため
// (ページを開き直したときと同じく空の覚えから始める。取得そのものは差し替えない)
const renderSeatMap = () =>
  render(
    <RouterContext.Provider value={pagesRouter}>
      <SWRConfig value={{ provider: () => new Map() }}>
        <LayoutSourceProvider>
          <div className='seat-map-root'>
            <AnnouncementProvider>
              <AvatarsProvider>
                <SelectedDateProvider>
                  <DetailPanelProvider>
                    <SeatMapView />
                  </DetailPanelProvider>
                </SelectedDateProvider>
              </AvatarsProvider>
            </AnnouncementProvider>
          </div>
        </LayoutSourceProvider>
      </SWRConfig>
    </RouterContext.Provider>
  )

const teamBoxes = () => [...document.querySelectorAll<HTMLElement>('[data-team-id]')]
const teamBoxIds = () => teamBoxes().map(box => box.dataset.teamId)

const teamBoxOf = (idPrefix: string): HTMLElement => {
  const box = document.querySelector<HTMLElement>(buildTeamSelector(idPrefix))
  if (box === null) throw new Error(`${idPrefix}のチーム箱が描かれていない`)
  return box
}

// 取得が済んでキャンバスにチーム箱が出るまで待つ。どのテストもこれを待ってから終える:
// 済む前に終えると、取得の後の書き込み(lib/mock-loader.ts の writeCache)が次のテストの空にした localStorage へ入る
const settleData = () => waitFor(() => expect(teamBoxes().length).toBeGreaterThan(0), WAIT)

// ---- カスタムレイアウトの保存で使う種と操作 ----

// カスタムレイアウトの種。既定のフロアの先頭のチーム(営業部)とその座席だけを持つ。チーム箱の並びが公式(5チーム)と
// 違うので、キャンバスがカスタムへ切り替わったかを箱で確かめられる。座席には空席がある(地図の編集で消す席に使う)
const CUSTOM_TEAM = DEFAULT_FLOOR_TEAMS[0]
const CUSTOM_SEATS = DEFAULT_FLOOR_SEED.seats.filter(seat => seat.teamId === CUSTOM_TEAM.id)
const CUSTOM_LAYOUT_ID = 'integration-custom-layout'
const CUSTOM_LAYOUT_NAME = 'テスト用レイアウト'

// 種は既定値の穴埋め(lib/layout-persistence.ts の migrateStoredLayout)の前の形、つまり種データのままで保存する。
const customLayoutSeed = (): SeatLayout => ({
  floorId: CUSTOM_LAYOUT_ID,
  floorName: CUSTOM_LAYOUT_NAME,
  viewBox: VIEWBOX,
  seats: CUSTOM_SEATS,
  teams: [CUSTOM_TEAM],
  facilities: [],
  furniture: [],
})

// 前にカスタムレイアウトを1つ作り、使い方ガイド(閲覧・地図の編集)も見終えた管理者の localStorage にする。
// 書き込みはアプリと同じ保存口(lib/layout-persistence.ts・lib/persist-tour-seen.ts)を通し、キー名と形をテストに写さない。
// 起動時に開くレイアウトは公式のままにし、画面のレイアウト切り替えでカスタムを選ぶ
// (起動時のレイアウトは LayoutSourceProvider がモジュールで1回しか読まず、テストごとに変えられないため)
const seedReturningAdmin = (customLayout: SeatLayout = customLayoutSeed()) => {
  saveCustomLayout(CUSTOM_LAYOUT_ID, customLayout)
  const updatedAt = new Date().toISOString()
  saveLayoutMetas([{ layoutId: CUSTOM_LAYOUT_ID, layoutName: CUSTOM_LAYOUT_NAME, updatedAt }])
  markSeen(MAIN_TOUR_STORAGE_KEY)
  markSeen(EDIT_TOUR_STORAGE_KEY)
}

// 今 localStorage にあるカスタムレイアウト(アプリの読み込み口で読んだもの)
const storedCustomLayout = () => loadCustomLayout(CUSTOM_LAYOUT_ID, VALID_EMPLOYEE_IDS)

// 利用者へ知らせた文言。地図の保存の成功は
// 保存トーストに出て、role=status を持つ
const STATUS = { selector: '[role=status]' }
const querySaveSuccess = () => screen.queryByText(TOAST_MESSAGES.SAVE_SUCCESS, STATUS)

// 画面上部のレイアウト切り替えから、種で作っておいたカスタムレイアウトを選ぶ。選んだ直後は保存分を読み終えるまで
// 公式の種で描くので、キャンバスがカスタムのチーム箱だけになるまで待つ
// (待たずに編集を始めると、保存時刻を持たない公式の種が編集の元になる)
const chooseCustomLayout = async (user: UserEvent) => {
  await settleData()
  const switcher = screen.getByRole('region', { name: 'レイアウト切り替え' })
  await user.click(within(switcher).getByRole('button', { expanded: false }))
  await user.click(within(switcher).getByRole('button', { name: CUSTOM_LAYOUT_NAME }))
  await waitFor(() => expect(teamBoxIds()).toEqual([CUSTOM_TEAM.idPrefix]), WAIT)
}

// 左下の追加メニューの「レイアウトを編集」から地図の編集に入り、空席を1つ選んで消し、「完了」で保存する。
// 空席は確認を挟まずに消える(hooks/use-edit-dialogs.ts)。保存が済んで地図の編集を抜けるまで待つ
const deleteEmptySeatOnMap = async (user: UserEvent) => {
  await user.click(screen.getByRole('button', { name: '追加メニューを開く' }))
  await user.click(screen.getByRole('menuitem', { name: 'レイアウトを編集' }))
  const seatList = screen.getByRole('group', { name: '座席一覧' })
  await user.click(within(seatList).getAllByRole('button', { name: '空席' })[0])
  const actionBar = await screen.findByRole('region', { name: '1席を選択中' }, WAIT)
  await user.click(within(actionBar).getByRole('button', { name: '座席を削除' }))
  const finish = screen.getByRole('button', { name: '編集を完了' })
  await user.click(finish)
  await waitFor(() => expect(finish.isConnected).toBe(false), WAIT)
}

beforeEach(() => {
  // 起動時のレイアウト(公式/カスタム)は LayoutSourceProvider がモジュールで1回だけ読んで覚える
  // (contexts/layout-source-context.tsx)。空にするのは描く前なので、どのテストも公式レイアウトから始まる
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('最初の表示', () => {
  it('キャンバスに既定のフロアのチーム箱を種データのチームの数だけ描き、箱ごとにそのチームの名前を出す', async () => {
    renderSeatMap()

    const expectedIds = DEFAULT_FLOOR_TEAMS.map(team => team.idPrefix).sort()
    await waitFor(() => expect(teamBoxIds().sort()).toEqual(expectedIds), WAIT)
    for (const team of DEFAULT_FLOOR_TEAMS) {
      expect(within(teamBoxOf(team.idPrefix)).getByText(team.name)).toBeTruthy()
    }
  })

  it('閲覧モードの上部に、ヘッダーの閉じた状態のメニューのボタンと、使い方ガイドのボタンを出す', async () => {
    renderSeatMap()

    const menu = within(screen.getByRole('banner')).getByRole('button', { name: 'メニュー' })
    expect(menu.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('button', { name: '使い方ガイド' })).toBeTruthy()
    await settleData()
  })
})

describe('カスタムレイアウトの保存', () => {
  beforeEach(() => {
    seedReturningAdmin()
  })

  // 1回目の保存の知らせが消える(TOAST_MS)のを待つので、時間切れを長めに取る
  it('地図の編集で保存したあと、もう一度変えて保存しても、2回目も保存でき、他の管理者の更新とは言わない', async () => {
    const user = userEvent.setup()
    renderSeatMap()
    await chooseCustomLayout(user)

    await deleteEmptySeatOnMap(user)
    expect(querySaveSuccess()).not.toBeNull()
    expect(storedCustomLayout()?.seats).toHaveLength(CUSTOM_SEATS.length - 1)
    // 2回目の知らせと見分けるため、1回目の知らせが消えてから次の編集に入る
    await waitFor(() => expect(querySaveSuccess()).toBeNull(), { timeout: TOAST_MS + 2_000 })

    await deleteEmptySeatOnMap(user)
    // 直す前は、表示中のレイアウトが1回目の保存の前の保存時刻のままで、2回目の保存が自分の1回目を
    // 他の管理者の更新と取り違え、2回目の変更を捨てて警告していた
    expect(screen.queryByText(TOAST_MESSAGES.CONFLICT_UPDATE)).toBeNull()
    expect(querySaveSuccess()).not.toBeNull()
    expect(storedCustomLayout()?.seats).toHaveLength(CUSTOM_SEATS.length - 2)
  }, 20_000)
})
