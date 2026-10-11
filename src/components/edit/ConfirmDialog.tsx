// 汎用の確認ダイアログ。文言だけを差し替えて使う。
// 既存の DeleteConfirmDialog / ObjectDeleteDialog は同じ .edit-dialog を持つが
// 文面が固有なのでそのまま残している(移行するなら別件で)
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useFocusTrap } from '@/hooks/use-focus-trap'
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss'
import { triggerHaptic } from '@/utils/haptic'
import e from './admin-edit.module.css'

// §05-3・§06-6: チーム削除はキーワード入力で確定ボタンを有効化するタイプ確認モーダルを要求する
type TypedConfirmation = {
  keyword: string
  placeholder?: string
}

type Props = {
  ariaLabel: string
  // §07-1 共通シェル: カード上部の見出し。省略時は message のみのシンプル表示(既存呼び出し互換)
  title?: ReactNode
  message: ReactNode
  confirmLabel: string
  // §07-3 のようにキャンセル文言が「やめる」以外になるケース向け。省略時は既存文言を維持
  cancelLabel?: string
  // §07-1 触覚: danger=error / その他=medium。省略時は 'danger'(既存呼び出しは全て赤ボタンのため現状維持)
  variant?: 'danger' | 'default'
  // 56pxアイコンバッジ + 確定ボタン内アイコン(§07-3 は delete_forever を指定)。省略時はどちらも非表示
  confirmIcon?: string
  onConfirm: () => void
  onCancel: () => void
  // 指定時のみ右上に×(aria-label='閉じる')を表示する(§07-1: 任意の×)
  onClose?: () => void
  // 指定時のみキーワード入力欄を表示し、一致するまで確定ボタンを無効化する(§05-3・§06-6)
  typedConfirmation?: TypedConfirmation
  // §07-4 の配属確認は role='alertdialog' を要求する。省略時は既存呼び出しと同じ 'dialog'
  role?: 'dialog' | 'alertdialog'
  // §07-5 の一括移動確認は単一ボタン「移動する」のみで、キャンセル導線は×だけ。
  // 省略時はfalseで、既存呼び出しは全てキャンセルボタンを表示したまま変わらない
  hideCancel?: boolean
}

export const ConfirmDialog = ({
  ariaLabel,
  title,
  message,
  confirmLabel,
  cancelLabel = 'やめる',
  variant = 'danger',
  confirmIcon,
  onConfirm,
  onCancel,
  onClose,
  typedConfirmation,
  role = 'dialog',
  hideCancel = false,
}: Props) => {
  const sheetRef = useRef<HTMLDivElement>(null)
  // 下スワイプはキャンセルと同じ扱い(確定にはしない)
  const { sheetHandlers, dragStyle } = useSwipeToDismiss({ onDismiss: onCancel })
  const cancelBtnRef = useRef<HTMLButtonElement>(null)
  const [typedValue, setTypedValue] = useState('')
  const canConfirm = !typedConfirmation || typedValue === typedConfirmation.keyword

  // 実ノード参照と、フックのシート root 登録を1つの ref に束ねる。毎レンダー新しい関数を渡すと
  // 背景スクロール連鎖ガードが着脱を繰り返すため参照を固定する(SheetShell と同じパターン)
  const setSheetNode = useCallback(
    (node: HTMLDivElement | null) => {
      sheetRef.current = node
      sheetHandlers.ref(node)
    },
    [sheetHandlers.ref]
  )

  // 常に最前面のダイアログなのでトラップは常時有効。SeatMapPortal 経由で body 直下に
  // 描かれ呼び出し元(TeamOverlay の useModalShell 等)のトラップ範囲外になるため自前で持つ
  useFocusTrap(true, sheetRef)

  // マウント時に直前のフォーカス要素を保存しキャンセルボタンへ初期フォーカス。
  // アンマウント時(確定/キャンセル/Esc いずれの経路でも)は保存先へフォーカスを戻す
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    const id = requestAnimationFrame(() => cancelBtnRef.current?.focus())
    return () => {
      cancelAnimationFrame(id)
      trigger?.focus()
    }
  }, [])

  // Esc はキャンセルと同じ扱い
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      ev.stopPropagation()
      onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const handleCancel = () => {
    triggerHaptic('light')
    onCancel()
  }

  const handleClose = () => {
    triggerHaptic('light')
    onClose?.()
  }

  const handleConfirm = () => {
    if (!canConfirm) return
    triggerHaptic(variant === 'danger' ? 'error' : 'medium')
    onConfirm()
  }

  return (
    <div className={e.editDialogBackdrop} onClick={onCancel}>
      <div
        ref={setSheetNode}
        className={e.editDialog}
        role={role}
        aria-modal='true'
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={sheetHandlers.onPointerDown}
        onPointerMove={sheetHandlers.onPointerMove}
        onPointerUp={sheetHandlers.onPointerUp}
        onPointerCancel={sheetHandlers.onPointerCancel}
        style={{
          transform: dragStyle.transform,
          transition: dragStyle.transition,
          willChange: dragStyle.willChange,
        }}
      >
        {onClose && (
          <button type='button' className={e.editDialogClose} aria-label='閉じる' onClick={handleClose}>
            <span className='material-symbols-outlined' aria-hidden='true'>
              close
            </span>
          </button>
        )}
        {confirmIcon && (
          <div className={`${e.editDialogIconBadge} ${variant === 'default' ? e.isDefaultVariant : ''}`}>
            <span className='material-symbols-outlined' aria-hidden='true'>
              {confirmIcon}
            </span>
          </div>
        )}
        {title && <p className={e.editDialogTitle}>{title}</p>}
        <p className={e.editDialogMessage}>{message}</p>
        {typedConfirmation && (
          <input
            type='text'
            className={e.editDialogTypedInput}
            value={typedValue}
            onChange={(ev) => setTypedValue(ev.target.value)}
            placeholder={typedConfirmation.placeholder ?? typedConfirmation.keyword}
            aria-label={`確認のため「${typedConfirmation.keyword}」と入力`}
          />
        )}
        <div className={e.editDialogActions}>
          {!hideCancel && (
            <button ref={cancelBtnRef} type='button' className={`pixel-btn ${e.editDialogCancel}`} onClick={handleCancel}>
              {cancelLabel}
            </button>
          )}
          <button
            type='button'
            className={`pixel-btn ${e.editDialogConfirm} ${variant === 'default' ? e.isDefaultVariant : ''}`}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {confirmIcon && (
              <span className='material-symbols-outlined' aria-hidden='true'>
                {confirmIcon}
              </span>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// §07-3: チーム削除確認の本文(4行)。TeamOverlay 等の呼び出し側から
// buildTeamDeleteConfirmMessage(...) の戻り値を ConfirmDialog の message props にそのまま渡す
export const buildTeamDeleteConfirmMessage = (teamLabel: string, occupiedCount: number, emptyCount: number) => {
  const totalCount = occupiedCount + emptyCount
  return (
    <>
      {`「${teamLabel}」を削除します。`}
      <br />
      {`配置済み ${occupiedCount}席・空席 ${emptyCount}席を含む`}
      <br />
      {`合計 ${totalCount}席が削除されます。`}
      <br />
      この操作は保存後に確定されます。
    </>
  )
}
