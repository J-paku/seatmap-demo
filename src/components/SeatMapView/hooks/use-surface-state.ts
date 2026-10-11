import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { FacilityHoverPayload } from '@/components/FacilityHoverCard'

// 画面の面の開閉・ホバー・選択数の状態。複数の面が同じ値を見るので、画面の根で持って配る

export type SurfaceState = {
  isDirectoryOpen: boolean
  setIsDirectoryOpen: Dispatch<SetStateAction<boolean>>
  hoverFacility: FacilityHoverPayload | null
  setHoverFacility: Dispatch<SetStateAction<FacilityHoverPayload | null>>
  isLayoutSwitcherOpen: boolean
  setIsLayoutSwitcherOpen: Dispatch<SetStateAction<boolean>>
  selectedSeatCount: number
  setSelectedSeatCount: Dispatch<SetStateAction<number>>
}

export const useSurfaceState = (): SurfaceState => {
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false)
  const [hoverFacility, setHoverFacility] = useState<FacilityHoverPayload | null>(null)
  // レイアウト切り替えアイランドの展開状態。開いている間は左下FABを隠す
  const [isLayoutSwitcherOpen, setIsLayoutSwitcherOpen] = useState(false)
  // 編集セッション中に選ばれている座席数。1席以上でFABを隠す(一括操作バーと重なるため)。
  // useState のセッタは参照が安定なので、memo 済みキャンバスの再描画は増えない
  const [selectedSeatCount, setSelectedSeatCount] = useState(0)

  return {
    isDirectoryOpen,
    setIsDirectoryOpen,
    hoverFacility,
    setHoverFacility,
    isLayoutSwitcherOpen,
    setIsLayoutSwitcherOpen,
    selectedSeatCount,
    setSelectedSeatCount,
  }
}
