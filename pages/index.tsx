import Head from 'next/head'
import { useRouter } from 'next/router'
import { LoginGate } from '@/components/LoginGate'
import { SeatMapView } from '@/components/SeatMapView'
import { DetailPanelProvider } from '@/contexts/detail-panel-context'
import { SelectedDateProvider } from '@/contexts/selected-date-context'
import { AvatarsProvider } from '@/contexts/avatars-context'
import { AnnouncementProvider } from '@/contexts/announcement-context'
import { useLoginSession } from '@/hooks/use-login-session'

const SITE_URL = 'https://j-paku.github.io/seatmap-demo/'
const SITE_TITLE = 'seat-map デモ'
const SITE_DESCRIPTION =
  'モックデータのみで再現した企業向け座席マップアプリのデモ。バックエンドなし、localStorageとモック生成のみで動作します。'

const HomePage = () => {
  // GitHub Pages配信(basePath付与)でも favicon が404にならないよう router から basePath を取得
  const { basePath } = useRouter()
  // 実物と同じくログイン画面から始まる。タブを開き直すと必ずゲートへ戻る
  const { isAuthenticated, authenticate } = useLoginSession()

  return (
    <>
      <Head>
        <title>{SITE_TITLE}</title>
        {/* viewport-fit=cover が無いと env(safe-area-inset-*) は全て 0 に解決される。
            AppHeader・a11y トースト・TeamOverlay の3箇所が既にこれを前提に書かれているため付ける */}
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
        />
        <meta name='description' content={SITE_DESCRIPTION} />
        <meta property='og:type' content='website' />
        <meta property='og:title' content={SITE_TITLE} />
        <meta property='og:description' content={SITE_DESCRIPTION} />
        <meta property='og:url' content={SITE_URL} />
        <meta name='twitter:card' content='summary' />
        <meta name='twitter:title' content={SITE_TITLE} />
        <meta name='twitter:description' content={SITE_DESCRIPTION} />
        {/* ブラウザは rel=icon の候補から自分で最適な方を選ぶ。.ico は 16/32/48 の PNG を
            束ねたもので、SVG を読めない環境向けに残す。どちらも logo.svg のマークと同じ図形 */}
        <link rel='icon' href={`${basePath}/favicon.ico`} sizes='any' />
        <link rel='icon' type='image/svg+xml' href={`${basePath}/favicon.svg`} />
      </Head>
      <div className='seat-map-root'>
        {/* ゲート中は座席マップを載せない。裏で初回ツアーやデータ取得が走るのを避ける */}
        {isAuthenticated ? (
          <AnnouncementProvider>
            <AvatarsProvider>
              <SelectedDateProvider>
                <DetailPanelProvider>
                  <SeatMapView />
                </DetailPanelProvider>
              </SelectedDateProvider>
            </AvatarsProvider>
          </AnnouncementProvider>
        ) : (
          <LoginGate onAuthenticated={authenticate} />
        )}
      </div>
    </>
  )
}

export default HomePage
