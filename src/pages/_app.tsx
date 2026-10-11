import type { AppProps } from 'next/app'
import '@/styles/globals.css'
import { LayoutSourceProvider } from '@/contexts/layout-source-context'

// STEP2: レイアウトが変わると開いている詳細パネルの座席IDが無効になるため、
// LayoutSourceProvider は DetailPanelProvider(pages/index.tsx 側)より外側に置く
const App = ({ Component, pageProps }: AppProps) => (
  <LayoutSourceProvider>
    <Component {...pageProps} />
  </LayoutSourceProvider>
)

export default App
