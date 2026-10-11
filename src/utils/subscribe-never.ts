// 起動直後に1回読んだら後から変わらない値を useSyncExternalStore で読むための購読口。
// 通知元が無いので購読はせず、何もしない解除関数を毎回同じ参照で返す
const noop = (): void => undefined
export const subscribeNever = (): (() => void) => noop
