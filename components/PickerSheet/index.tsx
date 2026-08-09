import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { FocusTrap } from '@/components/a11y/components/FocusTrap'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss'
import styles from '../object-picker.module.css'

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
  const { sheetHandlers, dragStyle } = useSwipeToDismiss({
    onDismiss: onClose,
    enabled: isOpen && isCompact,
  })

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
    <div className={styles.pickerWrap} role='presentation'>
      <div className={styles.pickerBackdrop} onClick={onClose} />
      <FocusTrap isActive className={`${styles.pickerPanel}${isCompact ? ` ${styles.isCompact}` : ''}`}>
        <div
          className={styles.pickerInner}
          role='dialog'
          aria-modal='true'
          aria-label={title}
          {...sheetHandlers}
          style={{
            // ドラッグ中は指へ追従(transform はフックが直接書き込む)、離指後はここの
            // transition が復帰してスナップバックする
            transform: dragStyle.transform,
            transition: dragStyle.transition,
            willChange: dragStyle.willChange,
          }}
        >
          {isCompact && <span className={styles.pickerGrip} aria-hidden='true' />}
          <div className={styles.pickerHead}>
            <h2 className={styles.pickerTitle}>{title}</h2>
            <button type='button' className={styles.pickerClose} aria-label='閉じる' onClick={onClose}>
              <span className='icon-msr-thin' aria-hidden='true'>
                close
              </span>
            </button>
          </div>
          {note && <p className={styles.pickerNote}>{note}</p>}
          <div className={styles.pickerBody}>{children}</div>
        </div>
      </FocusTrap>
    </div>
  )
}
