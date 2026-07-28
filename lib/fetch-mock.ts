// 静的 JSON を非同期 API のように遅延返却するユーティリティ
export const fetchMock = <T,>(data: T, delayMs = 200): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), delayMs))
