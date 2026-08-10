import { useCallback, useEffect, useRef, useState } from 'react'
import type { LayoutEditor } from '../type'
import { fetchMock } from '@/lib/fetch-mock'
import { useSeatLayout } from '@/hooks/use-mock-data'

// 07: 「完了」「キャンセル」「レイアウトをリセット」の保存まわり

// 完了処理の疑似遅延(01のfetchMock経由に準拠した保存中表現)
const FINISH_DELAY_MS = 400
const TOAST_MS = 2400

const MSG_SAVE_FAILED = '保存に失敗しました。もう一度お試しください'

type LayoutSave = {
  isSaving: boolean
  saveToast: string | null
  finish: () => void
  cancel: () => void
  resetLayout: () => void
}

export const useLayoutSave = (editor: LayoutEditor): LayoutSave => {
  const { persistLayout, resetLayout } = useSeatLayout()
  // 保存中フラグは編集セッションが持つ(保存中の編集を dispatch 側で弾くため)。
  // ここは通し先を変えず editor の値をそのまま流す
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
    editor.beginSave()
    const run = async () => {
      try {
        await fetchMock(true, FINISH_DELAY_MS)
        // saveStoredLayout(同期書き込み)と SWR の mutate のどちらも投げうる
        await persistLayout(layoutToSave)
      } catch {
        // 失敗時は localStorage へ何も書かれていない。ここでセッションを畳むと編集が丸ごと消えるので、
        // ロックだけ解いて編集内容と編集モードを残し、やり直せるようにする
        editor.endSave()
        editor.showError(MSG_SAVE_FAILED)
        return
      }
      editor.endSave()
      editor.finishEdit()
      setSaveToast('保存しました')
      if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current)
      toastTimeoutRef.current = window.setTimeout(() => setSaveToast(null), TOAST_MS)
    }
    void run()
  }, [editor, persistLayout])

  return {
    isSaving: editor.isSaving,
    saveToast,
    finish,
    cancel: useCallback(() => editor.cancelEdit(), [editor]),
    // 保存分を削除して種データへ復帰
    resetLayout: useCallback(() => void resetLayout(), [resetLayout]),
  }
}
