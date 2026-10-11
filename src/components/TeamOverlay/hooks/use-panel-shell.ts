import { useCallback, useRef } from 'react'
import { useModalShell } from './use-modal-shell'
import { allowsSwipeDismiss } from '../utils/allow-swipe-dismiss'
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss'

// パネル(ダイアログの実ノード)1つに、下スワイプで閉じるジェスチャーとモーダルの殻
// (スクロールロック・Escape・フォーカストラップ)を取り付ける。両方が同じノードを見るので ref もここで束ねる

type SwipeToDismiss = ReturnType<typeof useSwipeToDismiss>

export type UsePanelShellResult = {
  // パネルへ spread するポインターハンドラ一式(ref はこの後ろに置く setSheetNode が上書きする)
  sheetHandlers: SwipeToDismiss['sheetHandlers']
  // パネルの style へ混ぜる追従用の transform / transition
  dragStyle: SwipeToDismiss['dragStyle']
  // パネルの ref に渡す
  setSheetNode: (node: HTMLDivElement | null) => void
}

export const usePanelShell = (
  isOpen: boolean,
  isCompactMobile: boolean,
  // 閉じる口。編集中の破棄確認を挟む guardedClose を渡す
  onClose: () => void
): UsePanelShellResult => {
  // 下スワイプで閉じるのは Compact だけの挙動。内部スクロールが上端かどうかの判定は
  // フック側(computeScrollGate)がイベント経路から遡って行うため bodyRef は渡さない
  const sheetRef = useRef<HTMLDivElement>(null)
  const { sheetHandlers, dragStyle } = useSwipeToDismiss({
    onDismiss: onClose,
    enabled: allowsSwipeDismiss(isOpen, isCompactMobile),
  })
  // useModalShell(フォーカストラップ)へ渡す実ノード参照と、フックのシート root 登録を1つの ref に束ねる。
  // 毎レンダー新しい関数を渡すと背景スクロール連鎖ガードが着脱を繰り返すため参照を固定する
  const setSheetNode = useCallback(
    (node: HTMLDivElement | null) => {
      sheetRef.current = node
      sheetHandlers.ref(node)
    },
    [sheetHandlers.ref]
  )
  useModalShell(isOpen, sheetRef, onClose)

  return { sheetHandlers, dragStyle, setSheetNode }
}
