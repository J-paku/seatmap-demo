import { useEffect } from 'react'
import styles from './team-category-sheet.module.css'
import { FocusTrap } from '@/components/a11y/components/FocusTrap'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'

// §02-1 チームカテゴリシート。ボトムシートではなく常に中央モーダルカードで出す
// (家具・施設の PickerSheet は 640px 未満でボトムシート化するので共用しない)

type Props = {
  isOpen: boolean
  // §02-3 既存チームの取り込みシートへ進む
  onSelectImport: () => void
  onSelectCreate: () => void
  onClose: () => void
}

export const TeamCategorySheet = ({ isOpen, onSelectImport, onSelectCreate, onClose }: Props) => {
  useBodyScrollLock(isOpen)

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
    <div className={styles.wrap} role='presentation'>
      <div className={styles.backdrop} onClick={onClose} />
      <FocusTrap isActive className={styles.panel}>
        <div className={styles.inner} role='dialog' aria-modal='true' aria-label='チームを追加'>
          <div className={styles.head}>
            <h2 className={styles.title}>チームを追加</h2>
            <button type='button' className={styles.close} aria-label='閉じる' onClick={onClose}>
              <span className='icon-msr-thin' aria-hidden='true'>
                close
              </span>
            </button>
          </div>
          <div className={styles.list}>
            <button type='button' className={styles.tile} onClick={onSelectImport}>
              <span className={`icon-msr-thin ${styles.tileIcon}`} aria-hidden='true'>
                groups
              </span>
              <span className={styles.tileText}>
                <span className={styles.tileTitle}>既存チームから取り込み</span>
                <span className={styles.tileDesc}>デフォルトレイアウトのチームを配置</span>
              </span>
            </button>
            <button type='button' className={styles.tile} onClick={onSelectCreate}>
              <span className={`icon-msr-thin ${styles.tileIcon}`} aria-hidden='true'>
                add_circle
              </span>
              <span className={styles.tileText}>
                <span className={styles.tileTitle}>新規作成</span>
                <span className={styles.tileDesc}>新しいチームを作成</span>
              </span>
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  )
}
