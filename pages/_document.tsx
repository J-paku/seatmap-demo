import { Html, Head, Main, NextScript } from 'next/document'

const Document = () => (
  <Html lang='ja'>
    <Head>
      {/* 09-visual-tokens: Material Symbols(公式 css2 配布)。display=block でロード前のアイコン名フラッシュ防止 */}
      <link rel='preconnect' href='https://fonts.googleapis.com' />
      <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
      <link
        rel='stylesheet'
        href='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block'
      />
    </Head>
    <body>
      <Main />
      <NextScript />
    </body>
  </Html>
)

export default Document
