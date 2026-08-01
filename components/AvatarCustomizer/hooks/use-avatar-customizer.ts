// アバターカスタマイザの組立hook — パーツ構成・AIプロンプト・AI取り込みの3責務を束ね、
// AI自由ピクセル (importedPixels) とパーツ構成の優先順位を決めて有効 config を確定する
import { useCallback, useState, type ChangeEvent } from 'react'
import {
  QUICK_START_PRESETS,
  type QuickStartKind,
} from '@/lib/avatar/avatar-customizer-options'
import { deriveInitialParts } from '@/lib/avatar/avatar-initial-state'
import type { PartsAvatarConfig, PixelAvatarConfig, PixelsAvatarConfig } from '@/types'
import {
  usePartsModel,
  type PartsOptions,
  type PartsSetters,
  type PartsState,
} from './use-parts-model'
import { useAiPrompt } from './use-ai-prompt'
import { useAiImport } from './use-ai-import'

// QuickStartSection など消費側の import 経路維持のため再 export
export type { QuickStartKind }

interface UseAvatarCustomizerArgs {
  initialConfig?: PixelAvatarConfig | null
  onSave: (config: PixelAvatarConfig) => void
}

interface UseAvatarCustomizerResult {
  partsState: PartsState
  partsOptions: PartsOptions
  partsSetters: PartsSetters
  // プレビュー・保存に使う有効 config (AI自由ピクセル優先)
  activeConfig: PixelAvatarConfig
  aiPromptText: string
  aiRequestText: string
  aiImportText: string
  canImportAiCode: boolean
  // 取り込み失敗時の具体的なフィードバック文言 (成功・未試行時は null)
  aiImportErrorMessage: string | null
  handleAiRequestChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  handleAiImportTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  // コピー成功時に true を返す
  handleCopyAiPrompt: () => Promise<boolean>
  // インポート成功時に true を返す (呼び出し側のビュー遷移判定に利用)
  handleImportAiCode: () => boolean
  applyQuickStart: (kind: QuickStartKind) => void
  applyKuroxxx: () => void
  quickStartPresets: typeof QUICK_START_PRESETS
  handleSave: () => void
  handleReset: () => void
}

export const useAvatarCustomizer = ({
  initialConfig,
  onSave,
}: UseAvatarCustomizerArgs): UseAvatarCustomizerResult => {
  // AI自由ピクセル — import で取り込んだ pixels config。パーツ編集に戻ると破棄
  const [importedPixels, setImportedPixels] = useState<PixelsAvatarConfig | null>(
    initialConfig?.kind === 'pixels' ? initialConfig : null
  )

  // パーツ編集が起きたら AI自由ピクセルは破棄する
  const clearImportedPixels = useCallback(() => {
    setImportedPixels(null)
  }, [])

  const {
    partsState,
    partsOptions,
    partsSetters,
    currentConfig,
    applyQuickStart,
    applyKuroxxx,
    applyDerivedConfig,
    resetParts,
  } = usePartsModel({ initialConfig, onPartsMutate: clearImportedPixels })

  const { aiRequestText, aiPromptText, handleAiRequestChange, handleCopyAiPrompt, resetRequest } =
    useAiPrompt()

  // パーツ取り込み: 派生状態へ変換してパーツモデルへ反映 (clearImportedPixels も連動)
  const handleImportParts = useCallback(
    (config: PartsAvatarConfig) => {
      applyDerivedConfig(deriveInitialParts(config))
    },
    [applyDerivedConfig]
  )

  const {
    aiImportText,
    canImportAiCode,
    aiImportErrorMessage,
    handleAiImportTextChange,
    handleImportAiCode,
    resetImport,
  } = useAiImport({ onImportPixels: setImportedPixels, onImportParts: handleImportParts })

  // プレビュー・保存に使う有効 config — AI自由ピクセルがあれば優先
  const activeConfig: PixelAvatarConfig = importedPixels ?? currentConfig

  const handleSave = useCallback(() => {
    onSave(activeConfig)
  }, [activeConfig, onSave])

  const handleReset = useCallback(() => {
    resetParts()
    resetRequest()
    resetImport()
  }, [resetParts, resetRequest, resetImport])

  return {
    partsState,
    partsOptions,
    partsSetters,
    activeConfig,
    aiPromptText,
    aiRequestText,
    aiImportText,
    canImportAiCode,
    aiImportErrorMessage,
    handleAiRequestChange,
    handleAiImportTextChange,
    handleCopyAiPrompt,
    handleImportAiCode,
    applyQuickStart,
    applyKuroxxx,
    quickStartPresets: QUICK_START_PRESETS,
    handleSave,
    handleReset,
  }
}
