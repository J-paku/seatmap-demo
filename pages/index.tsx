import Head from 'next/head'
import { useRouter } from 'next/router'
import { SeatMapView } from '@/components/SeatMapView'
import { DetailPanelProvider } from '@/contexts/detail-panel-context'
import { SelectedDateProvider } from '@/contexts/selected-date-context'
import { SelfAvatarProvider } from '@/contexts/self-avatar-context'

const SITE_URL = 'https://j-paku.github.io/seatmap-demo/'
const SITE_TITLE = 'seat-map デモ'
const SITE_DESCRIPTION =
  'モックデータのみで再現した企業向け座席マップアプリのデモ。バックエンドなし、localStorageとモック生成のみで動作します。'

const HomePage = () => {
  // GitHub Pages配信(basePath付与)でも favicon が404にならないよう router から basePath を取得
  const { basePath } = useRouter()

  return (
    <>
      <Head>
        <title>{SITE_TITLE}</title>
        <meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' />
        <meta name='description' content={SITE_DESCRIPTION} />
        <meta property='og:type' content='website' />
        <meta property='og:title' content={SITE_TITLE} />
        <meta property='og:description' content={SITE_DESCRIPTION} />
        <meta property='og:url' content={SITE_URL} />
        <meta name='twitter:card' content='summary' />
        <meta name='twitter:title' content={SITE_TITLE} />
        <meta name='twitter:description' content={SITE_DESCRIPTION} />
        <link rel='icon' href={`${basePath}/favicon.ico`} />
      </Head>
      <div className='seat-map-root'>
        <SelfAvatarProvider>
          <SelectedDateProvider>
            <DetailPanelProvider>
              <SeatMapView />
            </DetailPanelProvider>
          </SelectedDateProvider>
        </SelfAvatarProvider>
      </div>
    </>
  )
}

export default HomePage
