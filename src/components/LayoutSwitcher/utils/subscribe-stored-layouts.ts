import type { StoredLayouts } from '@/lib/read-stored-layouts'

// 静的書き出しHTMLは「カスタム0件・デフォルト未設定」で焼かれている。初回クライアント描画を
// それに揃えないとトグル名やカウンターがHTMLと食い違い、React 19が例外#418を出す
const EMPTY_STORED_LAYOUTS: StoredLayouts = { layoutMetas: [], defaultLayoutId: null }
export const getServerStoredLayouts = (): StoredLayouts => EMPTY_STORED_LAYOUTS
