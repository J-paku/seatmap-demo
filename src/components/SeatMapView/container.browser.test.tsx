// 座席マップ画面(コンテナ)の統合テスト(Vitest Browser Mode)。画面を実際の Chromium で、フック・子と一緒に描き、
// 利用者に見える形(role・名前・文字・aria-*)と固定の DOM フック(data-team-id。CLAUDE.md 不変ルール4)で確かめる。
// 包む Provider は配信物と同じ木にする: _app.tsx の LayoutSourceProvider と、pages/index.tsx のログイン後の4つ。
// ログインゲートと <Head> はこの画面の外(pages/index.tsx)なので描かない。
// モジュールは差し替えない。localStorage は本物を使い、各テストの前に空にする(初めて訪れた利用者の状態から始める)。
// 画面が変わるのを Testing Library の waitFor・findBy* で待つ
// (React の act の環境を切っている理由は vitest.integration.setup.ts)
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
// ページのルーター(pages router)が useRouter へ値を配る文脈。ヘッダー(AppHeader)が useRouter で basePath を読む。
// 公開の入口が無いので、next/router が読むのと同じモジュールを直に指す(別のモジュールなら別の文脈になり、値が届かない)
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime'
import mitt from 'next/dist/shared/lib/mitt'
import type { NextRouter } from 'next/router'
import '@/styles/globals.css'
import { buildTeamSelector } from '@/components/SeatMapCanvas/utils/build-team-selector'
import { AnnouncementProvider } from '@/contexts/announcement-context'
import { AvatarsProvider } from '@/contexts/avatars-context'
import { DetailPanelProvider } from '@/contexts/detail-panel-context'
import { LayoutSourceProvider } from '@/contexts/layout-source-context'
import { SelectedDateProvider } from '@/contexts/selected-date-context'
import { FLOOR_SEEDS } from '@/lib/mock-loader'
import { DEFAULT_FLOOR_ID } from '@/utils/floors'
import { SeatMapView } from './container'

// 既定のフロア(本社1F。utils/floors.ts の DEFAULT_FLOOR_ID)の種データ。
// チーム箱のインタラクション面は data-team-id に Team.idPrefix を持つ(components/TeamArea.tsx)
const DEFAULT_FLOOR_SEED = FLOOR_SEEDS[DEFAULT_FLOOR_ID]
const DEFAULT_FLOOR_TEAMS = DEFAULT_FLOOR_SEED.teams

// モックの取得は 200〜500ms(lib/mock-loader.ts の responseDelay)遅れて返る。
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
// 取ったデータが残ると、localStorage を空にしても初めて訪れた状態にならないため
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
