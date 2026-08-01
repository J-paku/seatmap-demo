// アバターカスタマイザモーダルの状態と保存ハンドラを管理するフック
import { useCallback, useEffect, useState } from 'react'
import { useGlobalAnnouncement } from '@/components/a11y'
import { useEmployees } from '@/lib/mock-loader'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'
import { useSharedAvatars } from '@/contexts/avatars-context'
import { useCurrentUserCode } from '@/hooks/use-current-user-code'
import { lockBodyScroll, unlockBodyScroll } from '@/lib/body-scroll-lock'
import { TOAST_MESSAGES } from '@/constants/toast'
import type { PixelAvatarConfig, StoredAvatarRecord } from '@/types'

interface UseAvatarCustomizerModalParams {
  isOpen: boolean
  onClose: () => void
}

interface UseAvatarCustomizerModalResult {
  isReady: boolean
  initialConfig: PixelAvatarConfig | null
  currentUserName: string | undefined
  handleSave: (config: PixelAvatarConfig) => void
  handleClose: () => void
}

export function useAvatarCustomizerModal({
  isOpen,
  onClose,
}: UseAvatarCustomizerModalParams): UseAvatarCustomizerModalResult {
  const ownerCode = useCurrentUserCode()
  const { setMessage: setGlobalAnnouncement } = useGlobalAnnouncement()
  const {
    avatarConfigByOwnerCode,
    isInitialLoading: isAvatarInitialLoading,
    upsertLocalAvatar,
  } = useSharedAvatars()
  const [initialConfig, setInitialConfig] = useState<PixelAvatarConfig | null>(null)
  const [isReady, setIsReady] = useState(false)
  // 実物はログインユーザーのキャッシュから表示名を取るが、デモは本人がモック固定なのでそこから解決する
  const { data: employees } = useEmployees()
  const currentUserName = employees?.find((e) => e.id === SELF_EMPLOYEE_ID)?.name

  useEffect(() => {
    if (!isOpen) {
      // 開閉とアバター読込完了という2つのイベントに応じた準備完了フラグ
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(false)
      return
    }

    if (isAvatarInitialLoading) {
      return
    }

    setInitialConfig(ownerCode ? (avatarConfigByOwnerCode.get(ownerCode) ?? null) : null)
    setIsReady(true)
  }, [isOpen, isAvatarInitialLoading, avatarConfigByOwnerCode, ownerCode])

  useEffect(() => {
    if (!isOpen) return
    lockBodyScroll()
    return () => {
      unlockBodyScroll()
    }
  }, [isOpen])

  const handleSave = useCallback(
    async (config: PixelAvatarConfig) => {
      // Garoon 認証で社員番号さえ取れれば本人特定成立。USER マスター登録の有無は問わない
      if (!ownerCode) {
        setGlobalAnnouncement(`[error]${TOAST_MESSAGES.SAVE_FAILED}`)
        return
      }

      // 表示名 (Title) は user-info-cache の Name を使い、無ければ社員番号で代替
      const ownerName = currentUserName ?? ownerCode

      try {
        // 実物は Pleasanter へ保存するが、デモは共有コンテキスト経由で localStorage に永続化する
        const record: StoredAvatarRecord = {
          ownerCode,
          ownerName,
          config,
          updatedTime: new Date().toISOString(),
        }
        await upsertLocalAvatar(record)
        // 保存成功時のみ成功トースト + クローズ
        setGlobalAnnouncement(`[success]${TOAST_MESSAGES.SAVE_SUCCESS}`)
        onClose()
      } catch {
        setGlobalAnnouncement(`[error]${TOAST_MESSAGES.SAVE_FAILED}`)
      }
    },
    [ownerCode, currentUserName, upsertLocalAvatar, setGlobalAnnouncement, onClose]
  )

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  return {
    isReady,
    initialConfig,
    currentUserName,
    handleSave,
    handleClose,
  }
}
