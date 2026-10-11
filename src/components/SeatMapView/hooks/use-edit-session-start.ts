import { useCallback } from 'react'
import type { LayoutEditor } from '../type'

// 編集セッションの入口。追加導線・FAB の「レイアウトを編集」・キャンバスの長押しが同じ口を通る

export const useEditSessionStart = (editor: LayoutEditor): (() => void) => {
  // 閲覧モードのまま置き始めた時だけ編集セッションを起こす。既に編集中なら何もしない
  // (enterEditMode はワーキングコピーと undo スタックを作り直すので、二度呼ぶと編集内容が消える)
  const ensureEditSession = useCallback(() => {
    if (!editor.isEditMode) editor.enterEditMode()
  }, [editor])

  return ensureEditSession
}
