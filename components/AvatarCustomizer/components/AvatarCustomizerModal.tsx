import { useRef, useState } from 'react'
import { AiStudio } from './AiStudio'
import { AvatarPreview } from './AvatarPreview'
import { PartsPanel } from './PartsPanel'
import { useAiGenerator } from '../hooks/use-ai-generator'
import { useAvatarDraft } from '../hooks/use-avatar-draft'
import { useDialogShell } from '../hooks/use-dialog-shell'
import { cloneAvatar } from '../utils/clone-avatar'
import type { AvatarCustomizerModalProps } from '../type'
import { SEATMAP_BG_ID } from '@/components/SheetShell'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useBackgroundInert } from '@/hooks/use-background-inert'
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'

// 開いている間だけマウントされるモーダル本体。組み立てとフッター操作だけを持つ

type Props = AvatarCustomizerModalProps

// 保存トーストを見せてから閉じるまでの間
const SAVE_CLOSE_MS = 700

export const AvatarCustomizerModal = ({ initial, onSave, onClose }: Props) => {
  const [toast, setToast] = useState<string | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const avatar = useAvatarDraft(initial)
  const ai = useAiGenerator({ onGenerated: avatar.applyConfig, onToast: setToast })
  const { sheetRef: dialogRef, bind } = useSwipeDismiss({ onClose, scrollGateRef: scrollRef })

  useBodyScrollLock(true)
  useBackgroundInert(true, SEATMAP_BG_ID)
  useDialogShell(closeBtnRef, scrollRef, backdropRef, onClose)

  const runReset = () => {
    avatar.applyConfig(initial)
    ai.reset()
  }

  const runSave = () => {
    onSave(cloneAvatar(avatar.draft))
    setToast('保存しました')
    window.setTimeout(onClose, SAVE_CLOSE_MS)
  }

  return (
    <div className='ac-overlay'>
      <div ref={backdropRef} className='ac-backdrop' onClick={onClose} />
      <div ref={dialogRef} className='ac-dialog' role='dialog' aria-modal='true' aria-label='アバター編集' {...bind}>
        <div className='ac-handle-strip' data-handle='true'>
          <span className='ac-handle-bar' data-handle='true' />
        </div>
        <div className='ac-header'>
          <h2 className='ac-title'>アバター編集</h2>
          <button ref={closeBtnRef} type='button' className='ac-close' aria-label='閉じる' onClick={onClose}>
            ✕
          </button>
        </div>

        <div ref={scrollRef} className='ac-scroll'>
          <div className='ac-columns'>
            <div className='ac-col-left'>
              <AvatarPreview
                draft={avatar.draft}
                activePresetId={avatar.activePresetId}
                onApplyPreset={avatar.applyConfig}
              />
              <AiStudio
                view={ai.view}
                requestText={ai.requestText}
                loadingPhase={ai.loadingPhase}
                onChangeView={ai.setView}
                onChangeText={ai.setRequestText}
                onGenerate={ai.generate}
              />
            </div>

            <div className='ac-col-right'>
              <PartsPanel
                draft={avatar.draft}
                onPickHair={avatar.setHair}
                onPickFace={avatar.setFace}
                onPickOutfit={avatar.setOutfit}
                onPickHairColor={avatar.setHairColor}
                onPickSkinColor={avatar.setSkinColor}
                onPickOutfitColor={avatar.setOutfitColor}
              />
            </div>
          </div>
        </div>

        {/* フッター(スクロール外・常時固定) */}
        <div className='ac-footer'>
          <button type='button' className='ac-btn-ghost' onClick={runReset}>
            リセット
          </button>
          <button type='button' className='ac-btn-primary' onClick={runSave}>
            保存
          </button>
        </div>

        {toast && <div className='ac-toast'>{toast}</div>}
      </div>
    </div>
  )
}
