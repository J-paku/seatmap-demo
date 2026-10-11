// E2E を始める前に「いま応答しているサーバが、このチェックアウトの out/ を配っているか」を1回照合する。
// webServer.reuseExistingServer を true にしている(切ると、別プロセスがポートを握っている間は
// 手元の E2E が一切走らなくなる)ため、別の worktree・別セッションが同じポートを自分の out/ で
// 押さえていると、こちらの変更を丸ごと戻しても全 spec が緑になる。落ちないので誰も気づけない。
// そこで配信物を取り、out/ の対応するファイルと突き合わせて違えば即座に止める。
// Playwright が拾うのは *.spec.ts / *.test.ts だけなので、このファイルはテストとしては集められない
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { FullConfig } from '@playwright/test'

// 照合するのは入口の1枚だけ。この画面は1ページしか無く、index.html がコンテンツハッシュ付きの
// chunk 名を全部持つので、ソースが変われば必ずここが変わる。404 は照合しない —
// CLAUDE.md の静的配信手順(python3 -m http.server)は out/404.html ではなく自前の404を返すので、
// 同じ out/ を配っていても食い違って止まってしまう
const PAGE_PATH = '/'
const PAGE_FILE = path.resolve(__dirname, '../out/index.html')

// どのビルドだったかを報告に添えるための指紋。先頭の資産名は両ビルドで同じ CSS のことがあり、
// それだけでは「違う」と言いながら同じ指紋を並べてしまう。本文のハッシュを先に置いて必ず区別できるようにする
const fingerprint = (html: string): string => {
  const hash = createHash('sha256').update(html).digest('hex').slice(0, 12)
  const assets = [...html.matchAll(/\/_next\/static\/[^"']+/g)].map(hit => hit[0])
  const names =
    assets.length === 0 ? '(ハッシュ付きの資産が見当たらない)' : assets.slice(0, 2).join(' ')
  return `sha256:${hash} ${names}`
}

// Playwright は webServer を起こし url が応答するのを待ってから globalSetup を呼ぶ。
// それでも応答が取れないなら照合する材料が無いので、ここでは止めない(同じ URL を開くテスト側が落ちる)
const fetchPage = async (baseURL: string): Promise<string | null> => {
  try {
    const response = await fetch(new URL(PAGE_PATH, baseURL))
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return await response.text()
  } catch {
    return null
  }
}

async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? config.webServer?.url
  if (typeof baseURL !== 'string')
    throw new Error('baseURL が決まっていないので配信物を確かめられない')

  const served = await fetchPage(baseURL)
  if (served === null) return

  const expected = await readFile(PAGE_FILE, 'utf8').catch(() => null)
  if (expected === null) {
    throw new Error(
      [
        `${baseURL} で誰かがすでに配信しているが、照合先の ${PAGE_FILE} が無い。`,
        'npm run build でこのチェックアウトを書き出すか、そのサーバを止めてから走らせる',
        `配信されている側 ${PAGE_PATH}: ${fingerprint(served)}`,
      ].join('\n')
    )
  }

  if (served !== expected) {
    throw new Error(
      [
        `${baseURL} が配っているのは、このチェックアウトの out/ ではない(${PAGE_PATH} が違う)。`,
        'そのまま走らせても別のビルドを検査するだけで、今回の変更は結果に出ない。',
        'そのサーバを止める(ポートを空ける)か、E2E_PORT でポートを変えてから走らせる',
        `配信されている側 ${PAGE_PATH}: ${fingerprint(served)}`,
        `手元の out/index.html: ${fingerprint(expected)}`,
      ].join('\n')
    )
  }
}

export default globalSetup
