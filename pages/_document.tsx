import { Html, Head, Main, NextScript } from 'next/document'

const Document = () => (
  <Html lang='ja'>
    <Head>
      {/* 09-visual-tokens: Material Symbols(公式 css2 配布)。
          display=block は意図的。swap だとリガチャ解決前に「menu」等のアイコン名が素の文字で
          一瞬見えてしまうため、字形が出るまで描かせない block を選んでいる。
          @next/next/google-font-display はこの用途を想定していないので個別に無効化する */}
      <link rel='preconnect' href='https://fonts.googleapis.com' />
      <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
      {/* eslint-disable-next-line @next/next/google-font-display */}
      <link
        rel='stylesheet'
        href='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block'
      />
      {/* 移植UIの .icon-msr-* は Rounded を指すため併せて読み込む。
          Outlined だけだとリガチャが効かず「menu」等の文字がそのまま表示される */}
      {/* eslint-disable-next-line @next/next/google-font-display */}
      <link
        rel='stylesheet'
        href='https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block'
      />
    </Head>
    <body>
      <Main />
      <NextScript />
    </body>
  </Html>
)

export default Document
