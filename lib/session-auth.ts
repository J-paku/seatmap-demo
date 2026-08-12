// ログインゲートの通過状態を sessionStorage に持つ。タブを閉じれば消えるので
// 「新しく開いた時は必ずログイン画面から」を満たしつつ、リロードでは維持できる。
// localStorage を使わないのはこの区別のため(layout-persistence.ts とは保存先が違う)
const SESSION_AUTH_KEY = 'seatmap-demo/session-auth'

// useSyncExternalStore の購読者。sessionStorage は同一タブ内でしか変わらず storage イベントも
// 飛ばないので、書き込み側(writeSessionAuth)から明示的に通知する
const listeners = new Set<() => void>()

const notify = (): void => {
  listeners.forEach((listener) => {
    listener()
  })
}

export const subscribeSessionAuth = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// getSnapshot は同じ状態なら同じ参照を返さないと再描画が止まらない。そのため
// パースした結果ではなく保存された生文字列(プリミティブ)をそのまま返す
export const getSessionAuthSnapshot = (): string | null => {
  if (typeof window === 'undefined') return null

  try {
    return window.sessionStorage.getItem(SESSION_AUTH_KEY)
  } catch {
    // プライベートモード等で読めない環境では未ログインとして続行する
    return null
  }
}

// SSR・静的 export の初回描画では常に未ログイン。つまり書き出される HTML は必ずゲートになる
export const getServerSessionAuthSnapshot = (): string | null => null

export const writeSessionAuth = (loginId: string): void => {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify({ loginId }))
  } catch {
    // 書けなくても購読者へは通知する。ゲート通過自体はこの通知で成立する
  }
  notify()
}
