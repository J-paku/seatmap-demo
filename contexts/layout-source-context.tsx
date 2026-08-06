import { createContext, useCallback, useContext, useMemo, useState } from 'react'
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
const resolveInitialSource = (): LayoutSource => {
  // SSR/静的書き出しでは localStorage を参照できない(既存コードと同じ流儀の判定)
  if (typeof window === 'undefined') return OFFICIAL_SOURCE
  const defaultLayoutId = loadDefaultLayoutId()
  if (!defaultLayoutId) return OFFICIAL_SOURCE
  const exists = loadLayoutMetas().some((meta) => meta.layoutId === defaultLayoutId)
  return exists ? { type: 'custom', layoutId: defaultLayoutId } : OFFICIAL_SOURCE
}

const Ctx = createContext<LayoutSourceApi | null>(null)

export const LayoutSourceProvider = ({ children }: { children: ReactNode }) => {
  // 初期化関数の中で決定する。useEffectで後から差し替えると公式が1フレーム描かれてから
  // 切り替わるちらつきが出るため
  const [source, setSource] = useState<LayoutSource>(resolveInitialSource)

  const setOfficial = useCallback(() => setSource(OFFICIAL_SOURCE), [])

  const setCustom = useCallback((layoutId: string) => {
    setSource({ type: 'custom', layoutId })
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
