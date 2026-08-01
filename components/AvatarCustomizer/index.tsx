// ピクセルアバター カスタマイザ本体 — 4セクション(Preview/QuickStart/Parts/Actions) + AIスタジオの組立
import type { CSSProperties } from 'react'
import { forwardRef, useImperativeHandle } from 'react'
import { useAvatarCustomizer } from './hooks/use-avatar-customizer'
import { useAiStudio } from './hooks/use-ai-studio'
import { PreviewSection } from './sections/PreviewSection'
import { QuickStartSection } from './sections/QuickStartSection'
import { PartsSection } from './sections/PartsSection'
import { ActionsSection } from './sections/ActionsSection'
import { AiStudioSection } from './sections/AiStudioSection'
import type { PixelAvatarConfig } from '@/types'

interface AvatarCustomizerProps {
  initialConfig?: PixelAvatarConfig | null
  onSave: (config: PixelAvatarConfig) => void
  onClose: () => void
  // モーダル埋め込み時: カード枠なし、PC 2カラムレイアウト、フッターなし
  embedded?: boolean
}

// モーダル側からsave/reset/applyKurxxxを呼べるようにするハンドル型
export interface AvatarCustomizerHandle {
  save: () => void
  reset: () => void
  applyKuroxxx: () => void
}

const PANEL_STYLE: CSSProperties = {
  width: '100%',
  maxWidth: 520,
  minWidth: 0,
  background: 'var(--color-surface)',
  borderRadius: 16,
  border: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-modal)',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  padding: 20,
  color: 'var(--color-text-primary)',
  overflow: 'hidden',
}

export const AvatarCustomizer = forwardRef<AvatarCustomizerHandle, AvatarCustomizerProps>(
  function AvatarCustomizer({ initialConfig, onSave, onClose, embedded = false }, ref) {
    const customizer = useAvatarCustomizer({ initialConfig, onSave })
    const aiStudio = useAiStudio()
    const {
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
      quickStartPresets,
      handleSave,
      handleReset,
    } = customizer

    // モーダル埋め込み時: 親からsave/reset/applyKurxxxを呼べるよう公開
    useImperativeHandle(ref, () => ({ save: handleSave, reset: handleReset, applyKuroxxx }), [
      handleSave,
      handleReset,
      applyKuroxxx,
    ])

    // Extract state values for sections that still use them directly
    const { hair, face, accessory, outfit, paletteId } = partsState

    const partsSectionNode = (
      <PartsSection state={partsState} options={partsOptions} setters={partsSetters} />
    )

    // AIスタジオ — 2ボタン起点のフロー (作る → 入力 → プロンプト / インポート)
    const aiStudioNode = (
      <AiStudioSection
        view={aiStudio.view}
        aiPromptText={aiPromptText}
        aiRequestText={aiRequestText}
        aiImportText={aiImportText}
        canImportAiCode={canImportAiCode}
        aiImportErrorMessage={aiImportErrorMessage}
        onOpenCompose={aiStudio.openCompose}
        onOpenImport={aiStudio.openImport}
        onShowPrompt={aiStudio.showPrompt}
        onGoHome={aiStudio.goHome}
        onRequestChange={handleAiRequestChange}
        onImportTextChange={handleAiImportTextChange}
        onCopyPrompt={handleCopyAiPrompt}
        onImport={handleImportAiCode}
      />
    )

    // モーダル埋め込み時: カード枠なし + レスポンシブ配置
    // モバイル(flex-col): order で AIスタジオを最下段(フッター直上)へ
    // PC(grid): 左カラムに preview→quickstart→aiStudio を積み、3行目を 1fr にして余白を AIスタジオの「下」へ逃がす
    //   → 起動ボタンは quickstart 直下に固定され、展開時は下の余白へ伸びるため全体が上へジャンプしない
    if (embedded) {
      return (
        <div className='w-full min-w-0'>
          <div className='flex flex-col sm:grid sm:grid-cols-[240px_1fr] sm:grid-rows-[auto_auto_1fr] gap-3 p-4'>
            <div className='order-1 sm:col-start-1 sm:row-start-1'>
              <PreviewSection currentConfig={activeConfig} />
            </div>
            <div className='order-2 sm:col-start-1 sm:row-start-2'>
              <QuickStartSection
                hair={hair}
                face={face}
                accessory={accessory}
                outfit={outfit}
                paletteId={paletteId}
                quickStartPresets={quickStartPresets}
                applyQuickStart={applyQuickStart}
              />
            </div>
            <div className='order-4 sm:order-none sm:col-start-1 sm:row-start-3 sm:self-start'>
              {aiStudioNode}
            </div>
            <div className='order-3 sm:order-none sm:col-start-2 sm:row-start-1 sm:row-span-3'>
              {partsSectionNode}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div style={PANEL_STYLE}>
        <PreviewSection currentConfig={activeConfig} />

        <QuickStartSection
          hair={hair}
          face={face}
          accessory={accessory}
          outfit={outfit}
          paletteId={paletteId}
          quickStartPresets={quickStartPresets}
          applyQuickStart={applyQuickStart}
        />

        {partsSectionNode}

        {aiStudioNode}

        <ActionsSection onClose={onClose} handleReset={handleReset} handleSave={handleSave} />
      </div>
    )
  }
)
