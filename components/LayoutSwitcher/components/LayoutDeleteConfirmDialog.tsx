import type { LayoutMeta } from '@/types'
import { ConfirmDialog } from '@/components/edit/ConfirmDialog'

type Props = {
  target: LayoutMeta
  onConfirm: () => void
  onCancel: () => void
}

// カスタムレイアウト削除の確認ダイアログ。見た目・スワイプ挙動は既存のConfirmDialogに委ね、
// ここではLayoutSwitcher固有の文言だけを差し込む
export const LayoutDeleteConfirmDialog = ({ target, onConfirm, onCancel }: Props) => {
  return (
    <ConfirmDialog
      ariaLabel='レイアウト削除の確認'
      message={
        <>
          このレイアウトを削除しますか？
          <br />
          <strong>{target.layoutName}</strong>を削除します。この操作は取り消せません。
        </>
      }
      confirmLabel='削除'
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
