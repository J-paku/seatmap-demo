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
import { DEFAULT_FLOOR_ID, isFloorId } from '@/utils/floors'
import type { FloorId } from '@/types'

// STEP2: 複数レイアウト対応 — 現在表示中のレイアウトが公式(どのフロアか)か、カスタムのどれかを表す。
// 実物の updatedTime はサーバキャッシュ鮮度用でここでは不要なので持たない
export type LayoutSource =
  | { type: 'official'; floorId: FloorId }
  | { type: 'custom'; layoutId: string }

type LayoutSourceApi = {
  source: LayoutSource
  // 引数を省略した呼び出し(カスタム削除後の公式復帰など)は既定フロアへ戻す。
  // 戻り値は実際に切り替えたか(false=同じ値の再選択で何もしていない)。呼び出し側の再選択判定はこれに一本化する(#17)
  setOfficial: (floorId?: string) => boolean
  setCustom: (layoutId: string) => boolean
}

const OFFICIAL_SOURCE: LayoutSource = { type: 'official', floorId: DEFAULT_FLOOR_ID }

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

  // 選んだフロアはlocalStorageへ保存しない。保存すると初回クライアント描画が静的HTML(必ず既定フロア)
  // と食い違い、React #418 が再発する。
  // floorIdは未検証の文字列として受け(LayoutSourceのfloorIdはFloorId型で保証するため、境界の
  // ここでisFloorId検証してから使う)、既に同じフロアが選択中なら何もしない(#17: 再選択防御をここへ一本化)
  const setOfficial = useCallback(
    (floorId: string = DEFAULT_FLOOR_ID): boolean => {
      const validFloorId = isFloorId(floorId) ? floorId : DEFAULT_FLOOR_ID
      if (source.type === 'official' && source.floorId === validFloorId) return false
      setSelectedSource(
        validFloorId === DEFAULT_FLOOR_ID ? OFFICIAL_SOURCE : { type: 'official', floorId: validFloorId }
      )
      return true
    },
    [source]
  )

  // 既に同じカスタムレイアウトが選択中なら何もしない(#17: setOfficialと同じ理由)
  const setCustom = useCallback(
    (layoutId: string): boolean => {
      if (source.type === 'custom' && source.layoutId === layoutId) return false
      setSelectedSource({ type: 'custom', layoutId })
      return true
    },
    [source]
  )

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
