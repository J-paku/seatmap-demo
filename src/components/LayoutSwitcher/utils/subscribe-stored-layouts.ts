import type { StoredLayouts } from '@/lib/read-stored-layouts'

// 静的書き出しHTMLは「カスタム0件・デフォルト未設定」で焼かれている。初回クライアント描画を
// それに揃えないとトグル名やカウンターがHTMLと食い違い、React 19が例外#418を出す
const EMPTY_STORED_LAYOUTS: StoredLayouts = { layoutMetas: [], defaultLayoutId: null }
export const getServerStoredLayouts = (): StoredLayouts => EMPTY_STORED_LAYOUTS

// 起動直後の値は後から変わらないので購読先が無い。以降の変更は保存後の読み直しが受け持つ
const noop = (): void => undefined
export const subscribeStoredLayouts = (): (() => void) => noop
