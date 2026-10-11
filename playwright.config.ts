// out/ を静的配信し、実ブラウザで画面状態を作ってから scripts/verify-*.js を注入して判定する
import { defineConfig, devices } from '@playwright/test'

// 同じ機械で2つのセッション・worktree が同時に E2E を回すと、先にポートを握った側のビルドを
// 互いに検査してしまうので、E2E_PORT でポートを分けられるようにする
const PORT = Number(process.env.E2E_PORT ?? 4173)

// 配信版(GitHub Pages)を検査するときは E2E_BASE_URL に配信版の URL を渡す
// (例: https://<user>.github.io/seatmap-demo/)。CLAUDE.md の完了条件「配信版でも PASS」のための口で、
// このときは手元のサーバを起こさず、out/ との照合もしない(相手はこのチェックアウトの out/ ではない)。
// 末尾の / は必ず付ける。画面は相対の './' で開くので、/ が無いと basePath(/seatmap-demo)が落ちる。
// 配信版には計測(GoatCounter)のタグが載っている。遮断は tests/seatmap.helpers.ts の test が
// どのモードでも必ず敷くので、この spec 群以外の道具で配信版を開かないこと
const REMOTE_BASE_URL = process.env.E2E_BASE_URL
  ? process.env.E2E_BASE_URL.replace(/\/?$/, '/')
  : undefined
const BASE_URL = REMOTE_BASE_URL ?? `http://localhost:${PORT}/`

export default defineConfig({
  testDir: 'tests',
  // 走り出す前に、そのポートを配っているのが「このチェックアウトの out/」かどうかを1回だけ照合する。
  // reuseExistingServer は切らない(切ると他プロセスがポートを握っている間 E2E が走らない)代わりに、
  // 別の worktree・別セッションのビルドを検査して全部緑になる事故をここで止める
  globalSetup: REMOTE_BASE_URL ? undefined : './tests/global-setup.ts',
  // 手元の最長は通路だけが見える位置まで拡大とパンを重ねる回で14秒。どのテストも実時間の待ちを
  // 積み上げる作りで、遅いランナーでは既定の30秒に届きうるので倍を取る
  timeout: 60_000,
  // どのテストも自分の context で画面を開き直す。シナリオ間で結果を突き合わせる spec だけが
  // ファイル内で serial を宣言する(tests/ghost-placement.spec.ts)
  fullyParallel: true,
  // ドラッグ・端パン・ズームの判定は実時間の待ちを挟むので、ブラウザを並べすぎて詰まらせないよう手元は4本で止める
  workers: process.env.CI ? undefined : 4,
  // CI では test.only の混入を落とす
  forbidOnly: !!process.env.CI,
  // 再試行はしない(CI も手元も0)。再試行で通った失敗は緑として残り、揺れる検査を隠す
  retries: 0,
  use: { baseURL: BASE_URL },
  webServer: REMOTE_BASE_URL
    ? undefined
    : {
        command: `npx serve out -l ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: true,
      },
  // 画面寸法は移す前の運転台(scripts/run-*.mjs)と同じ 1280×900 に固定する。
  // 端の判定・空き位置の探索がこの寸法を前提にしている
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
})
