import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AvatarConfig } from './types'
import { useEmployees } from './mock-loader'

// 08: 本人(emp-001 固定)アバターの共有状態。localStorage 永続 + 全画面伝播 + 編集モーダル開閉
export const SELF_EMPLOYEE_ID = 'emp-001'
const STORAGE_KEY = 'seatmap-demo:avatar:emp-001'

type SelfAvatarApi = {
  // localStorage 保存値(未保存/パース不能は null)
  override: AvatarConfig | null
  // 本人の実効アバター(override ?? シード ?? null)
  selfAvatar: AvatarConfig | null
  // 指定社員の表示アバターを解決(本人のみ override 優先)
  resolveAvatar: (employeeId: string, seed: AvatarConfig) => AvatarConfig
  save: (config: AvatarConfig) => void
  isEditorOpen: boolean
  openEditor: () => void
  closeEditor: () => void
}

const Ctx = createContext<SelfAvatarApi | null>(null)

// AvatarConfig の緩い型ガード(localStorage 由来値の検証用)
const isAvatarConfig = (value: unknown): value is AvatarConfig => {
  if (value === null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.hair !== 'string' || typeof v.face !== 'string' || typeof v.outfit !== 'string') return false
  const p = v.palette
  if (p === null || typeof p !== 'object') return false
  const pal = p as Record<string, unknown>
  return typeof pal.hair === 'string' && typeof pal.skin === 'string' && typeof pal.outfit === 'string'
}

// 起動時に localStorage を1回読む(パース不能はシードにフォールバック=null)
const readStored = (): AvatarConfig | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isAvatarConfig(parsed) ? parsed : null
  } catch {
    // 破損値は無視してシードへフォールバック
    return null
  }
}

export const SelfAvatarProvider = ({ children }: { children: ReactNode }) => {
  const [override, setOverride] = useState<AvatarConfig | null>(() => readStored())
  const [isEditorOpen, setEditorOpen] = useState(false)
  const { data: employees } = useEmployees()

  // 本人のシードアバター(employees.json 由来)
  const seedSelf = useMemo(
    () => employees?.find((e) => e.id === SELF_EMPLOYEE_ID)?.avatar ?? null,
    [employees]
  )

  const selfAvatar = override ?? seedSelf

  const resolveAvatar = useCallback(
    (employeeId: string, seed: AvatarConfig) =>
      employeeId === SELF_EMPLOYEE_ID && override ? override : seed,
    [override]
  )

  const save = useCallback((config: AvatarConfig) => {
    setOverride(config)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      // localStorage 不可環境(プライベートモード等)では state のみ更新
    }
  }, [])

  const openEditor = useCallback(() => setEditorOpen(true), [])
  const closeEditor = useCallback(() => setEditorOpen(false), [])

  const api = useMemo<SelfAvatarApi>(
    () => ({ override, selfAvatar, resolveAvatar, save, isEditorOpen, openEditor, closeEditor }),
    [override, selfAvatar, resolveAvatar, save, isEditorOpen, openEditor, closeEditor]
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useSelfAvatar = (): SelfAvatarApi => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSelfAvatar は SelfAvatarProvider 内で使用すること')
  return v
}
