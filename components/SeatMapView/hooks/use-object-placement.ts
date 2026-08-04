import { useCallback, useMemo, useState } from 'react'
import type { GhostRequest } from '@/components/GhostPlacementLayer'
import type { ObjectCategory } from '@/components/ObjectCategorySheet'
import { siblingRectsForObject } from '@/components/SeatMapCanvas/utils/sibling-rects'
import { useGhostPlacement } from '@/hooks/use-ghost-placement'
import type { GhostPlacement } from '@/hooks/use-ghost-placement'
import type { UseLayoutEditorApi } from '@/hooks/use-layout-editor'
import { FURNITURE_DEFAULT_SIZE, FURNITURE_KIND_LABEL } from '@/utils/furniture-catalog'
import { placementBlocked } from '@/utils/layout-rules'
import type { Rect } from '@/utils/rect'
import type { FurnitureKind } from '@/types'

// 追加導線の状態機械。FAB → カテゴリ → (家具なら)ピッカー → ゴースト → 確定。
// ゴーストの幾何は use-ghost-placement、置けるかどうかの規則は utils/layout-rules が持ち、
// ここは「今どの段にいるか」と「確定したら何を発行するか」だけを持つ

// 会議室の既定サイズ
const FACILITY_DEFAULT_SIZE = { width: 200, height: 150 }
// 配置していない間に渡す寸法。参照を固定しないとゴースト側の初期化が毎レンダー走る
const IDLE_SIZE = { width: 0, height: 0 }

type PlacementFlow =
  | { step: 'idle' }
  | { step: 'category' }
  | { step: 'furniture-picker' }
  | { step: 'placing'; request: GhostRequest }

export type ObjectPlacement = {
  isFabOpen: boolean
  isCategoryOpen: boolean
  isFurniturePickerOpen: boolean
  request: GhostRequest | null
  placement: GhostPlacement
  toggleFab: () => void
  selectCategory: (category: ObjectCategory) => void
  selectFurniture: (kind: FurnitureKind) => void
  confirm: () => void
  cancel: () => void
}

// 配置が成立したことの通知。呼び出し側が「元に戻す」チップを出すのに使う
type Options = { onPlaced?: (rect: Rect) => void }

export const useObjectPlacement = (editor: UseLayoutEditorApi, { onPlaced }: Options = {}): ObjectPlacement => {
  const [flow, setFlow] = useState<PlacementFlow>({ step: 'idle' })
  const layout = editor.editingLayout
  const request = flow.step === 'placing' ? flow.request : null
  const selfRef = request?.selfRef ?? null

  const siblings = useMemo(
    () => (layout ? siblingRectsForObject(layout, selfRef) : []),
    [layout, selfRef]
  )

  const isBlocked = useCallback(
    (rect: Rect) => (layout ? placementBlocked(layout, selfRef, rect) : false),
    [layout, selfRef]
  )

  const placement = useGhostPlacement({
    active: request !== null,
    size: request?.size ?? IDLE_SIZE,
    initialRect: request?.initialRect ?? null,
    resizable: request?.resizable ?? false,
    siblings,
    isBlocked,
  })

  const toggleFab = useCallback(() => {
    setFlow((prev) => (prev.step === 'idle' ? { step: 'category' } : { step: 'idle' }))
  }, [])

  const selectCategory = useCallback((category: ObjectCategory) => {
    if (category === 'furniture') {
      setFlow({ step: 'furniture-picker' })
      return
    }
    if (category === 'facility') {
      setFlow({
        step: 'placing',
        request: {
          target: { type: 'add-facility' },
          label: '会議室',
          size: FACILITY_DEFAULT_SIZE,
          initialRect: null,
          resizable: true,
          outline: 'solid',
          selfRef: null,
        },
      })
    }
  }, [])

  const selectFurniture = useCallback((kind: FurnitureKind) => {
    setFlow({
      step: 'placing',
      request: {
        target: { type: 'add-furniture', furnitureKind: kind },
        label: FURNITURE_KIND_LABEL[kind],
        size: FURNITURE_DEFAULT_SIZE[kind],
        initialRect: null,
        resizable: true,
        outline: 'solid',
        selfRef: null,
      },
    })
  }, [])

  const cancel = useCallback(() => setFlow({ step: 'idle' }), [])

  const confirm = useCallback(() => {
    if (!request) return
    const rect = placement.commit()
    if (!rect) return
    const { target } = request
    // 失敗(重なりなど)ならゴーストを開いたままにして、位置を直せるようにする
    const ok =
      target.type === 'add-furniture'
        ? editor.addFurniture(target.furnitureKind, rect)
        : target.type === 'add-facility'
          ? editor.addFacility(rect)
          : false
    if (!ok) return
    setFlow({ step: 'idle' })
    onPlaced?.(rect)
  }, [request, placement, editor, onPlaced])

  return {
    isFabOpen: flow.step !== 'idle',
    isCategoryOpen: flow.step === 'category',
    isFurniturePickerOpen: flow.step === 'furniture-picker',
    request,
    placement,
    toggleFab,
    selectCategory,
    selectFurniture,
    confirm,
    cancel,
  }
}
