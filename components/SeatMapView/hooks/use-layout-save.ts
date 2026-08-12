import { useCallback, useEffect, useRef, useState } from 'react'
import type { LayoutEditor } from '../type'
import { fetchMock } from '@/lib/fetch-mock'
import { useSeatLayout } from '@/hooks/use-mock-data'
import { useLayoutSource } from '@/contexts/layout-source-context'
import { loadCustomLayout, loadStoredLayout } from '@/lib/layout-persistence'
import { EMPLOYEES } from '@/lib/mock-loader'
import { TOAST_MESSAGES } from '@/utils/toast-messages'
import type { StoredSeatLayout } from '@/types'

// 07: 「完了」「キャンセル」「レイアウトをリセット」の保存まわり
// 05-6: 楽観ロック(カスタムレイアウトのみ)と、保存成功トーストの「元に戻す」もここへ集約する

// 完了処理の疑似遅延(01のfetchMock経由に準拠した保存中表現)
const FINISH_DELAY_MS = 400
// 07-6: 保存成功トーストの表示時間(仕様通り5秒)。画面中央への配置は seatmap.module.css の .saveToast 側
const TOAST_MS = 5000

// 楽観ロックの照合・「元に戻す」用スナップショットの読み直しで使う実在社員id集合。
// hooks/use-mock-data.ts の VALID_EMPLOYEE_IDS と同じ EMPLOYEES から作る(同一ソースからの
// 同一導出なので判定基準の重複には当たらない)。「元に戻す」は読み直した版をそのまま書き戻すため、
// 空集合などで誤魔化すと宙ぶらりん社員idの穴埋めが狂う
const VALID_EMPLOYEE_IDS: ReadonlySet<string> = new Set(EMPLOYEES.map((employee) => employee.id))

type LayoutSave = {
  isSaving: boolean
  saveToast: string | null
  // 保存成功トースト表示中(TOAST_MS の間)だけ true。「元に戻す」ボタンの表示可否に使う
  canUndoSave: boolean
  finish: () => void
  cancel: () => void
  resetLayout: () => void
  // 05-6:「元に戻す」— 直前の保存で上書きした版を書き戻す
  undoSave: () => void
}

export const useLayoutSave = (editor: LayoutEditor): LayoutSave => {
  const { persistLayout, resetLayout } = useSeatLayout()
  const { source } = useLayoutSource()
  // 保存中フラグは編集セッションが持つ(保存中の編集を dispatch 側で弾くため)。
  // ここは通し先を変えず editor の値をそのまま流す
  // 07: 「完了」で保存が発生した時だけ表示する一過性トースト
  const [saveToast, setSaveToast] = useState<string | null>(null)
  const [canUndoSave, setCanUndoSave] = useState(false)
  const toastTimeoutRef = useRef<number | null>(null)
  // 05-6: 直前の保存で上書きした版(「元に戻す」で書き戻す対象)。保存の度に更新する
  const previousLayoutRef = useRef<StoredSeatLayout | null>(null)
  // 直前の保存で実際に書き込まれたupdatedTime。「元に戻す」自身の楽観ロック照合キー
  const lastSavedUpdatedTimeRef = useRef<string | null>(null)
  // undoSave の二重発火防止(トースト表示中の連打対策)
  const isUndoingRef = useRef(false)

  useEffect(
    () => () => {
      if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current)
    },
    []
  )

  // 表示中ソース(公式/カスタム)の保存済みレイアウトを読み直す。楽観ロック照合と
  // 「元に戻す」用スナップショットの両方がここを通る(キー生成・穴埋めロジックの重複を避けるため
  // lib/layout-persistence.ts の読み込み口をそのまま使う)
  const readCurrentStored = useCallback((): StoredSeatLayout | null => {
    return source.type === 'official'
      ? loadStoredLayout(source.floorId, VALID_EMPLOYEE_IDS)
      : loadCustomLayout(source.layoutId, VALID_EMPLOYEE_IDS)
  }, [source])

  // 保存成功トースト(+「元に戻す」)を出し、TOAST_MS後に自動で消す
  const showSaveToast = useCallback((message: string, undoable: boolean) => {
    setSaveToast(message)
    setCanUndoSave(undoable)
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = window.setTimeout(() => {
      setSaveToast(null)
      setCanUndoSave(false)
    }, TOAST_MS)
  }, [])

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
        const currentStored = readCurrentStored()
        // 05-6: カスタムレイアウトだけ楽観ロックを照合する(公式は仕様上競合検知なし)。
        // セッション開始時に保持していたupdatedTime(layoutToSave.updatedTime)と今読み直した値が
        // 食い違えば、別タブが先に上書きしている — ローカル変更を破棄して警告する
        if (
          source.type === 'custom' &&
          currentStored &&
          layoutToSave.updatedTime !== currentStored.updatedTime
        ) {
          editor.endSave()
          editor.cancelEdit()
          editor.showError(TOAST_MESSAGES.CONFLICT_UPDATE)
          return
        }
        // 上書き前の版を「元に戻す」用に退避してから保存する
        previousLayoutRef.current = currentStored
        // saveStoredLayout(同期書き込み)と SWR の mutate のどちらも投げうる
        await persistLayout(layoutToSave)
      } catch {
        // 失敗時は localStorage へ何も書かれていない。ここでセッションを畳むと編集が丸ごと消えるので、
        // ロックだけ解いて編集内容と編集モードを残し、やり直せるようにする
        editor.endSave()
        editor.showError(TOAST_MESSAGES.SAVE_FAILED)
        return
      }
      // 保存直後にもう一度読み直し、実際に書き込まれたupdatedTimeを「元に戻す」の照合キーにする
      // (persistLayoutはstampForSaveが打った新しい版を呼び出し側へ返さないため、ここで実測する)
      lastSavedUpdatedTimeRef.current = readCurrentStored()?.updatedTime ?? null
      editor.endSave()
      editor.finishEdit()
      showSaveToast(TOAST_MESSAGES.SAVE_SUCCESS, previousLayoutRef.current !== null)
    }
    void run()
  }, [editor, persistLayout, readCurrentStored, showSaveToast, source])

  // 05-6:「元に戻す」— 直前の保存で上書きした版を書き戻す。保存トースト表示中だけ意味を持つ
  // (previousLayoutRef はトーストと同時に破棄はしないが、UIの押下導線はcanUndoSaveで閉じる)
  const undoSave = useCallback(() => {
    if (isUndoingRef.current) return
    const previous = previousLayoutRef.current
    if (!previous) return
    isUndoingRef.current = true
    const run = async () => {
      try {
        await fetchMock(true, FINISH_DELAY_MS)
        const currentStored = readCurrentStored()
        const expectedUpdatedTime = lastSavedUpdatedTimeRef.current
        // 自分がこの保存を書き込んでから、別タブがさらに上書きしていないかを照合する
        if (currentStored && expectedUpdatedTime !== null && currentStored.updatedTime !== expectedUpdatedTime) {
          editor.showError(TOAST_MESSAGES.CONFLICT_UPDATE)
          return
        }
        await persistLayout(previous)
      } catch {
        editor.showError(TOAST_MESSAGES.SAVE_FAILED)
        return
      } finally {
        isUndoingRef.current = false
      }
      previousLayoutRef.current = null
      lastSavedUpdatedTimeRef.current = null
      showSaveToast(TOAST_MESSAGES.UNDO_SUCCESS, false)
    }
    void run()
  }, [editor, persistLayout, readCurrentStored, showSaveToast])

  return {
    isSaving: editor.isSaving,
    saveToast,
    canUndoSave,
    finish,
    cancel: useCallback(() => editor.cancelEdit(), [editor]),
    // 保存分を削除して種データへ復帰
    resetLayout: useCallback(() => void resetLayout(), [resetLayout]),
    undoSave,
  }
}
