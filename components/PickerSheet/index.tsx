import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { FocusTrap } from '@/components/a11y/components/FocusTrap'
import { useBackdropTouchGuard } from '@/hooks/use-backdrop-touch-guard'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss'
import { triggerHaptic } from '@/utils/haptic'
import styles from '../object-picker.module.css'

// 選択シートの共通シェル。640px 未満はボトムシート(下スワイプで閉じる)、
// 以上は中央モーダル。フォーカストラップと Esc 閉じを持つ。
// カテゴリ選択・家具ピッカー・社員検索が同じ形を使う

const COMPACT_QUERY = '(max-width: 639px)'

type Props = {
  isOpen: boolean
  title: string
  // ダイアログのaria-label。省略時はtitleをそのまま使う(既存呼び出し元の挙動を変えない)。
  // §08-4: 社員検索シートのように、見出し文言(座席配置)とaria-label(社員検索)が異なる画面のために分離
  ariaLabel?: string
  // 見出し左に置くMaterial Symbolsのアイコン名(任意)
  icon?: string
  // 見出し直下の補足。ゴーストがどこに出るかの予告などに使う
  note?: string
  // パネルの材質。'glass' は FAB のスピードダイヤルと同じリキッドグラス、'opaque' は不透明カード。
  // 既定は現状の見た目と同じ 'opaque'(他の呼び出し元を壊さない)
  material?: 'opaque' | 'glass'
  onClose: () => void
  children: ReactNode
}

export const PickerSheet = ({
  isOpen,
  title,
  ariaLabel,
  icon,
  note,
  material = 'opaque',
  onClose,
  children,
}: Props) => {
  const isCompact = useMediaQuery(COMPACT_QUERY)
  const backdropRef = useRef<HTMLDivElement>(null)
  const { sheetHandlers, dragStyle } = useSwipeToDismiss({
    onDismiss: onClose,
    enabled: isOpen && isCompact,
  })
  // 参照カウントの実体は utils/body-scroll-lock.ts のみ。独自カウンタは作らない
  useBodyScrollLock(isOpen)
  useBackdropTouchGuard(backdropRef, isOpen)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // 明示的な閉じ操作(× / つまみのタップ)だけ触覚を出す。暗幕・Escape は無音のまま。
  // つまみを引いて離した場合は useSwipeToDismiss 側が触覚を出し、続く合成 click は
  // suppressGhostClick() が capture 段階で握り潰すので、ここと二重には鳴らない
  const closeWithHaptic = () => {
    triggerHaptic('light')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.pickerWrap} role='presentation'>
      <div
        ref={backdropRef}
        className={styles.pickerBackdrop}
        data-picker-backdrop='true'
        onClick={onClose}
      />
      <FocusTrap
        isActive
        className={`${styles.pickerPanel}${isCompact ? ` ${styles.isCompact}` : ''}${material === 'glass' ? ` ${styles.isGlass}` : ''}`}
      >
        <div
          className={styles.pickerInner}
          role='dialog'
          aria-modal='true'
          aria-label={ariaLabel ?? title}
          {...sheetHandlers}
          style={{
            // ドラッグ中は指へ追従(transform はフックが直接書き込む)、離指後はここの
            // transition が復帰してスナップバックする
            transform: dragStyle.transform,
            transition: dragStyle.transition,
            willChange: dragStyle.willChange,
          }}
        >
          {isCompact && (
            <button
              type='button'
              className={styles.pickerGrip}
              data-sheet-grabber='true'
              // useSwipeToDismiss が「持ち手起点」を見る属性。外すと、少し引いて離した時に
              // ドラッグ確定 → スナップバック → 合成clickの握り潰し、で無反応になる
              data-drag-handle='true'
              aria-label='シートを閉じる'
              onClick={closeWithHaptic}
            />
          )}
          <div className={styles.pickerHead}>
            {icon && (
              <span className='icon-msr-thin' aria-hidden='true'>
                {icon}
              </span>
            )}
            <h2 className={styles.pickerTitle}>{title}</h2>
            <button type='button' className={styles.pickerClose} aria-label='閉じる' onClick={closeWithHaptic}>
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
