import { useCallback, useEffect, useRef, useState } from 'react'
import type { LayoutEditor } from '../type'
import { fetchMock } from '@/lib/fetch-mock'
import { useSeatLayout } from '@/lib/mock-loader'

// 07: 「完了」「キャンセル」「レイアウトをリセット」の保存まわり

// 完了処理の疑似遅延(01のfetchMock経由に準拠した保存中表現)
const FINISH_DELAY_MS = 400
const TOAST_MS = 2400

type LayoutSave = {
  isSaving: boolean
  saveToast: string | null
  finish: () => void
  cancel: () => void
  resetLayout: () => void
}

export const useLayoutSave = (editor: LayoutEditor): LayoutSave => {
  const { persistLayout, resetLayout } = useSeatLayout()
  const [isSaving, setIsSaving] = useState(false)
  // 07: 「完了」で保存が発生した時だけ表示する一過性トースト
  const [saveToast, setSaveToast] = useState<string | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current)
    },
    []
  )

  // baselineとの差分が無ければ何も保存せず終了。差分があればlocalStorageへ保存して終了
  const finish = useCallback(() => {
    const layoutToSave = editor.editingLayout
    if (editor.changedCount === 0 || !layoutToSave) {
      editor.finishEdit()
      return
    }
    setIsSaving(true)
    fetchMock(true, FINISH_DELAY_MS).then(async () => {
      await persistLayout(layoutToSave)
      setIsSaving(false)
      editor.finishEdit()
      setSaveToast('保存しました')
      if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current)
      toastTimeoutRef.current = window.setTimeout(() => setSaveToast(null), TOAST_MS)
    })
  }, [editor, persistLayout])

  return {
    isSaving,
    saveToast,
    finish,
    cancel: useCallback(() => editor.cancelEdit(), [editor]),
    // 保存分を削除して種データへ復帰
    resetLayout: useCallback(() => void resetLayout(), [resetLayout]),
  }
}
