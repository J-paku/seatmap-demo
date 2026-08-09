// AI生成コードの取り込み状態管理 — 貼り付けテキストの保持・厳格パース・失敗フィードバック
// パース成功時の反映先 (パーツ / AI自由ピクセル) は呼び出し側のコールバックへ委譲する
import { useCallback, useState, type ChangeEvent } from 'react'
import { useGlobalAnnouncement } from '../../a11y'
import { TOAST_MESSAGES } from '@/constants/toast'
import {
  parseAiImportedConfig,
  type AvatarImportError,
} from '@/utils/avatar/avatar-import-parser'
import type { PartsAvatarConfig, PixelsAvatarConfig } from '@/types'
import { resolveAvatarImportErrorMessage } from '../utils/avatar-import-messages'

interface UseAiImportArgs {
  // AI自由ピクセルとして取り込んだ場合の反映先
  onImportPixels: (pixels: PixelsAvatarConfig) => void
  // パーツ構成として取り込んだ場合の反映先
  onImportParts: (config: PartsAvatarConfig) => void
}

interface UseAiImportResult {
  aiImportText: string
  canImportAiCode: boolean
  // 取り込み失敗時の具体的なフィードバック文言 (成功・未試行時は null)
  aiImportErrorMessage: string | null
  handleAiImportTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  // インポート成功時に true を返す (呼び出し側のビュー遷移判定に利用)
  handleImportAiCode: () => boolean
  resetImport: () => void
}

export const useAiImport = ({
  onImportPixels,
  onImportParts,
}: UseAiImportArgs): UseAiImportResult => {
  const { setMessage: setGlobalAnnouncement } = useGlobalAnnouncement()
  const [aiImportText, setAiImportText] = useState('')
  // 取り込み失敗理由 — 入力変更・成功時に解除する
  const [aiImportError, setAiImportError] = useState<AvatarImportError | null>(null)

  const canImportAiCode = aiImportText.trim().length > 0

  const handleAiImportTextChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setAiImportText(event.target.value)
    // 入力が変われば前回の失敗表示を消す
    setAiImportError(null)
  }, [])

  const handleImportAiCode = useCallback((): boolean => {
    // 正規スキーマ (kind=parts + 必須 ID + 必須 HEX) のみ受理。外れた場合は理由を提示して中断
    const result = parseAiImportedConfig(aiImportText)

    if (!result.ok) {
      setAiImportError((result as { ok: false; error: AvatarImportError }).error)
      return false
    }

    setAiImportError(null)
    if (result.config.kind === 'pixels') {
      // AI自由ピクセル: パーツへ変換せず保持し、プレビュー・保存に使う
      onImportPixels(result.config)
    } else {
      onImportParts(result.config)
    }
    setAiImportText('')
    setGlobalAnnouncement(`[success]${TOAST_MESSAGES.AVATAR_IMPORT_SUCCESS}`)
    return true
  }, [aiImportText, onImportPixels, onImportParts, setGlobalAnnouncement])

  const resetImport = useCallback(() => {
    setAiImportText('')
    setAiImportError(null)
  }, [])

  return {
    aiImportText,
    canImportAiCode,
    aiImportErrorMessage: resolveAvatarImportErrorMessage(aiImportError),
    handleAiImportTextChange,
    handleImportAiCode,
    resetImport,
  }
}
