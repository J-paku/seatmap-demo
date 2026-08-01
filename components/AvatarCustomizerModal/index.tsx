// アバターカスタマイザのボトムシートモーダル — 設定パネルから起動
import { useEffect, useRef } from 'react'
import { triggerHaptic } from '@/lib/haptic'
import { AvatarCustomizer } from '@/components/AvatarCustomizer'
import type { AvatarCustomizerHandle } from '@/components/AvatarCustomizer'
import { useKuroCode } from '@/components/AvatarCustomizer/hooks/use-kuro-code'
import { ActionsSection } from '@/components/AvatarCustomizer/sections/ActionsSection'
import { SheetDragHandle } from '@/components/SheetDragHandle'
import { FocusTrap } from '@/components/a11y/components/FocusTrap'
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss'
import { useScrollChainGuard } from '@/hooks/use-scroll-chain-guard'
import { useAvatarCustomizerModal } from './hooks/use-avatar-customizer-modal'

interface AvatarCustomizerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AvatarCustomizerModal({ isOpen, onClose }: AvatarCustomizerModalProps) {
  const customizerRef = useRef<AvatarCustomizerHandle>(null)
  const { isReady, initialConfig, handleSave, handleClose } = useAvatarCustomizerModal({
    isOpen,
    onClose,
  })

  const { sheetHandlers, dragStyle, dragOffset, resetDrag } = useSwipeToDismiss({
    onDismiss: onClose,
  })
  // 内部スクロールの端での過剰スワイプが背景へ連鎖するのを遮断(最上端からの下スワイプ閉じを成立させる)
  const { scrollContainerProps } = useScrollChainGuard()

  // 本モーダルは常時マウントされ isOpen のみ切替わるため、前回スワイプ閉じで残留した
  // dragOffset が次回オープン時の transform に持ち越され「開くたび高さが変わる」現象を起こす。
  // オープン時に明示リセットして毎回ニュートラル位置から開始する。
  useEffect(() => {
    if (isOpen) resetDrag()
  }, [isOpen, resetDrag])

  // ヒドル降臨コード — モーダルが開いている間だけ有効 (isOpen = false で登録しない)
  useKuroCode(() => {
    customizerRef.current?.applyKuroxxx()
  }, isOpen)

  // Escape キーで閉じる
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !isReady) return null

  return (
    <div
      className='fixed inset-0 flex items-end sm:items-center justify-center bg-black/50'
      // z はデモの尺度(styles/tokens.css)に合わせる。Tailwind の z-50 だとサイドバー(501)の下に潜る
      style={{ zIndex: 'var(--z-index-modal)' }}
      role='dialog'
      aria-modal='true'
      aria-label='アバター編集'
      onClick={onClose}
    >
      <FocusTrap isActive={isOpen}>
        <div
          className='relative w-full sm:max-w-[780px] h-[85dvh] sm:h-[92vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden'
          onClick={event => event.stopPropagation()}
          {...sheetHandlers}
          style={{
            background: 'var(--color-surface)',
            // ドラッグ中のみtransform/willChange/transitionを適用 — 常時GPU合成レイヤーを保持すると子スクロールの入力がholdされる
            transform: dragOffset > 0 ? dragStyle.transform : undefined,
            transition: dragOffset > 0 ? dragStyle.transition : undefined,
            willChange: dragOffset > 0 ? 'transform' : undefined,
          }}
        >
          {/* ヘッダー: スワイプハンドル(視覚のみ・モバイル) + タイトル — DetailPanel と同パターン */}
          <div className='relative' style={{ borderBottom: '1px solid var(--color-border)' }}>
            <SheetDragHandle onTap={onClose} />
            <div className='flex items-start justify-between px-4 pt-2.5 pb-2.5 sm:px-5'>
              <div>
                <p
                  className='text-base font-extrabold tracking-tight'
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  アバター編集
                </p>
              </div>
              {/* PCのみ表示する閉じるボタン */}
              <button
                type='button'
                aria-label='閉じる'
                onClick={() => {
                  triggerHaptic('light')
                  onClose()
                }}
                className='hidden sm:flex items-center justify-center w-8 h-8 rounded-lg transition-colors flex-shrink-0 ml-3'
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--color-surface-elevated)'
                  e.currentTarget.style.color = 'var(--color-text-primary)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = ''
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }}
              >
                <span className='icon-msr-filled text-xl'>close</span>
              </button>
            </div>
          </div>

          {/* スクロール可能コンテンツ — フッターはスクロール外 */}
          <div
            {...scrollContainerProps}
            className='flex-1 overflow-y-auto'
            style={{
              background: 'var(--color-surface-sunken)',
              // バウンス連鎖を親に伝播させない — Chromeモバイルでバウンス中ポインター入力がholdされる現象を抑制
              overscrollBehavior: 'contain',
              // 縦スクロールのみを許可してジェスチャー判定の遅延を抑制
              touchAction: 'pan-y',
              // iOSのモメンタムスクロール明示
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <AvatarCustomizer
              ref={customizerRef}
              initialConfig={initialConfig}
              onSave={handleSave}
              onClose={handleClose}
              embedded
            />
          </div>

          {/* アクションフッター — スクロール領域外で常に底部固定 */}
          <div
            className='flex-shrink-0 px-5 py-2.5'
            style={{
              background: 'var(--color-surface)',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <ActionsSection
              onClose={handleClose}
              handleReset={() => customizerRef.current?.reset()}
              handleSave={() => customizerRef.current?.save()}
              compact
            />
          </div>
        </div>
      </FocusTrap>
    </div>
  )
}

export default AvatarCustomizerModal
