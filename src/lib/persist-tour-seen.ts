// 既読判定。SSR では常に既読扱いにして自動表示を止める。localStorage 参照が例外を投げる
// 環境では未読扱いにして再生は続ける。値は旧表記 'true' も既読とみなす(null でなければ既読)
export const readSeen = (storageKey: string): boolean => {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(storageKey) !== null
  } catch {
    return false
  }
}

// 既読にする。SSR(window が無い)も下の catch が受けるので、readSeen と違って先に分けない
// (分けても結果は同じで、テストで見分けられない書き方が残るだけ)
export const markSeen = (storageKey: string): void => {
  try {
    window.localStorage.setItem(storageKey, '1')
  } catch {
    // 保存できなくても再生は続ける
  }
}
