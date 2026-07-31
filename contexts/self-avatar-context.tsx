import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AvatarConfig } from '@/types'
import { useEmployees } from '@/lib/mock-loader'
import { loadStoredAvatar, saveStoredAvatar } from '@/lib/avatar-persistence'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'

// 08: 本人(emp-001 固定)アバターの共有状態。localStorage 永続 + 全画面伝播 + 編集モーダル開閉

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

export const SelfAvatarProvider = ({ children }: { children: ReactNode }) => {
  // 初回レンダーは SSR と一致させるため常に null(=シード表示)から始め、
  // マウント後に1回だけ localStorage を読んで反映する(ハイドレーション不一致回避)
  const [override, setOverride] = useState<AvatarConfig | null>(null)
  const [isEditorOpen, setEditorOpen] = useState(false)
  const { data: employees } = useEmployees()

  useEffect(() => {
    const stored = loadStoredAvatar()
    if (stored) setOverride(stored)
  }, [])

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
    saveStoredAvatar(config)
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
