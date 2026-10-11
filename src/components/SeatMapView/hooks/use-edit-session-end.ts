import { useCallback } from 'react'
import type { LayoutSave } from './use-layout-save'
import type { ObjectPlacement } from './use-object-placement'

// 編集セッションの出口(「完了」と「キャンセル」)。
// 配置フローはセッションの内側にある。ゴーストを畳まずにセッションだけ閉じると、
// 読み取り専用の地図の上に暗幕とゴーストだけが残り、× 以外の逃げ道が無くなる

export type EditSessionEnd = {
  handleSessionCancel: () => void
  handleSessionFinish: () => void
}

export const useEditSessionEnd = (placement: ObjectPlacement, save: LayoutSave): EditSessionEnd => {
  const handleSessionCancel = useCallback(() => {
    placement.cancel()
    save.cancel()
  }, [placement.cancel, save.cancel])

  const handleSessionFinish = useCallback(() => {
    placement.cancel()
    save.finish()
  }, [placement.cancel, save.finish])

  return { handleSessionCancel, handleSessionFinish }
}
