import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'
import { loadDefaultLayoutId, loadLayoutMetas } from '@/lib/layout-persistence'

// STEP2: 複数レイアウト対応 — 現在表示中のレイアウトが公式か、カスタムのどれかを表す。
// 実物の updatedTime はサーバキャッシュ鮮度用でここでは不要なので持たない
export type LayoutSource = { type: 'official' } | { type: 'custom'; layoutId: string }

type LayoutSourceApi = {
  source: LayoutSource
  setOfficial: () => void
  setCustom: (layoutId: string) => void
}

const OFFICIAL_SOURCE: LayoutSource = { type: 'official' }

// 起動直後に開くレイアウトを決める。デフォルトIDがメタ一覧に実在する時だけカスタムを採用する。
// 実在チェックを飛ばすと、削除済みIDが残ったままのブラウザで起動直後に真っ白になる
const readStoredSource = (): LayoutSource => {
  const defaultLayoutId = loadDefaultLayoutId()
  if (!defaultLayoutId) return OFFICIAL_SOURCE
  const exists = loadLayoutMetas().some((meta) => meta.layoutId === defaultLayoutId)
  return exists ? { type: 'custom', layoutId: defaultLayoutId } : OFFICIAL_SOURCE
}

// getSnapshotは呼ぶたびに同じ参照を返す必要があるので、最初の1回だけ読んで保持する
let storedSourceSnapshot: LayoutSource | null = null
const getStoredSource = (): LayoutSource => {
  if (!storedSourceSnapshot) storedSourceSnapshot = readStoredSource()
  return storedSourceSnapshot
}

// 静的書き出しHTMLは必ず公式レイアウトで焼かれているので、サーバー用スナップショットも公式を返す。
// useStateの初期化関数でlocalStorageを読むと初回クライアント描画がHTMLと食い違い、React 19は
// そのサブツリーをクライアント描画へ落とす(ちらつきは消えないまま例外#418だけが増える)
const getServerStoredSource = (): LayoutSource => OFFICIAL_SOURCE

// 起動直後の値は後から変わらないので購読先が無い。以降の変更は選択操作の状態が受け持つ
const noop = (): void => undefined
const subscribeStoredSource = (): (() => void) => noop

const Ctx = createContext<LayoutSourceApi | null>(null)

export const LayoutSourceProvider = ({ children }: { children: ReactNode }) => {
  // ハイドレーション直後にlocalStorage由来の値へ差し替わる(useSyncExternalStoreの差し替えは
  // ペイント前に同期で流れるため、useEffectで書き戻すよりちらつきが小さい)
  const storedSource = useSyncExternalStore(
    subscribeStoredSource,
    getStoredSource,
    getServerStoredSource
  )
  // 切り替え操作が入ったらそちらが優先。未操作のうちは保存済みの起動レイアウトを見る
  const [selectedSource, setSelectedSource] = useState<LayoutSource | null>(null)
  const source = selectedSource ?? storedSource

  const setOfficial = useCallback(() => setSelectedSource(OFFICIAL_SOURCE), [])

  const setCustom = useCallback((layoutId: string) => {
    setSelectedSource({ type: 'custom', layoutId })
  }, [])

  const api = useMemo<LayoutSourceApi>(
    () => ({ source, setOfficial, setCustom }),
    [source, setOfficial, setCustom]
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useLayoutSource = (): LayoutSourceApi => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLayoutSource は LayoutSourceProvider 内で使用すること')
  return v
}
