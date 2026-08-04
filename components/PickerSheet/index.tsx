import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { FocusTrap } from '@/components/a11y/components/FocusTrap'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'

// 選択シートの共通シェル。640px 未満はボトムシート(下スワイプで閉じる)、
// 以上は中央モーダル。フォーカストラップと Esc 閉じを持つ。
// カテゴリ選択・家具ピッカー・社員検索が同じ形を使う

const COMPACT_QUERY = '(max-width: 639px)'

type Props = {
  isOpen: boolean
  title: string
  // 見出し直下の補足。ゴーストがどこに出るかの予告などに使う
  note?: string
  onClose: () => void
  children: ReactNode
}

export const PickerSheet = ({ isOpen, title, note, onClose, children }: Props) => {
  const isCompact = useMediaQuery(COMPACT_QUERY)
  const { sheetRef, bind } = useSwipeDismiss({ onClose, enabled: isOpen && isCompact })

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className='picker-wrap' role='presentation'>
      <div className='picker-backdrop' onClick={onClose} />
      <FocusTrap isActive className={`picker-panel${isCompact ? ' is-compact' : ''}`}>
        <div ref={sheetRef} className='picker-inner' role='dialog' aria-modal='true' aria-label={title} {...bind}>
          {isCompact && <span className='picker-grip' aria-hidden='true' />}
          <div className='picker-head'>
            <h2 className='picker-title'>{title}</h2>
            <button type='button' className='picker-close' aria-label='閉じる' onClick={onClose}>
              <span className='icon-msr-thin' aria-hidden='true'>
                close
              </span>
            </button>
          </div>
          {note && <p className='picker-note'>{note}</p>}
          <div className='picker-body'>{children}</div>
        </div>
      </FocusTrap>
    </div>
  )
}
