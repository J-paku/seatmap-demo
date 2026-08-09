// 汎用の確認ダイアログ。文言だけを差し替えて使う。
// 既存の DeleteConfirmDialog / ObjectDeleteDialog は同じ .edit-dialog を持つが
// 文面が固有なのでそのまま残している(移行するなら別件で)
import { useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useFocusTrap } from '@/hooks/use-focus-trap'
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss'
import e from './admin-edit.module.css'

type Props = {
  ariaLabel: string
  message: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog = ({ ariaLabel, message, confirmLabel, onConfirm, onCancel }: Props) => {
  const sheetRef = useRef<HTMLDivElement>(null)
  // 下スワイプはキャンセルと同じ扱い(確定にはしない)
  const { sheetHandlers, dragStyle } = useSwipeToDismiss({ onDismiss: onCancel })
  const cancelBtnRef = useRef<HTMLButtonElement>(null)

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

  return (
    <div className={e.editDialogBackdrop} onClick={onCancel}>
      <div
        ref={setSheetNode}
        className={e.editDialog}
        role='dialog'
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
        <p className={e.editDialogMessage}>{message}</p>
        <div className={e.editDialogActions}>
          <button ref={cancelBtnRef} type='button' className={`pixel-btn ${e.editDialogCancel}`} onClick={onCancel}>
            やめる
          </button>
          <button type='button' className={`pixel-btn ${e.editDialogConfirm}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
