import { useCallback, useMemo, useState } from 'react'
import type { GhostRequest } from '@/components/GhostPlacementLayer'
import type { ObjectCategory } from '@/components/ObjectCategorySheet'
import { siblingRectsForObject } from '@/components/SeatMapCanvas/utils/sibling-rects'
import { useGhostPlacement } from '@/hooks/use-ghost-placement'
import type { GhostPlacement } from '@/hooks/use-ghost-placement'
import type { UseLayoutEditorApi } from '@/hooks/use-layout-editor/use-layout-editor'
import { FURNITURE_DEFAULT_SIZE, FURNITURE_KIND_LABEL } from '@/utils/furniture-catalog'
import { rectOfRef } from '@/utils/layout-objects'
import { placementBlocked } from '@/utils/layout-rules'
import type { Rect } from '@/utils/rect'
import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH } from '@/utils/seat-relayout'
import { GHOST_MIN_SIZE } from '@/hooks/use-ghost-placement'
import type { FurnitureKind, LayoutObjectRef } from '@/types'

// 追加導線の状態機械。カテゴリ → (家具なら)ピッカー → ゴースト → 確定。
// ゴーストの幾何は use-ghost-placement、置けるかどうかの規則は utils/layout-rules が持ち、
// ここは「今どの段にいるか」と「確定したら何を発行するか」だけを持つ。
// メニューの開閉は FAB 側(useAdminAddFab)の持ち物なのでここには無い

// 会議室の既定サイズ
const FACILITY_DEFAULT_SIZE = { width: 200, height: 150 }
// チームエリアの最小サイズ。座席は後から追加導線で足す
const TEAM_DEFAULT_SIZE = { width: 200, height: 100 }
// 配置していない間に渡す寸法。参照を固定しないとゴースト側の初期化が毎レンダー走る
const IDLE_SIZE = { width: 0, height: 0 }
// 会議室は座席1つ分より小さくしない。家具は共通の最小辺まで縮められる
const FACILITY_MIN_SIZE = { width: DEFAULT_SEAT_WIDTH, height: DEFAULT_SEAT_HEIGHT }
const FURNITURE_MIN_SIZE = { width: GHOST_MIN_SIZE, height: GHOST_MIN_SIZE }

type PlacementFlow =
  | { step: 'idle' }
  | { step: 'category' }
  | { step: 'furniture-picker' }
  | { step: 'team-form' }
  | { step: 'placing'; request: GhostRequest }

export type ObjectPlacement = {
  // idle でない = 追加導線のどこかに居る
  isActive: boolean
  isCategoryOpen: boolean
  isFurniturePickerOpen: boolean
  isTeamFormOpen: boolean
  request: GhostRequest | null
  // ゴーストで掴み直し中の対象。キャンバス側が実体を淡く描くのに使う
  repositioningRef: LayoutObjectRef | null
  placement: GhostPlacement
  openCategory: () => void
  selectCategory: (category: ObjectCategory) => void
  selectFurniture: (kind: FurnitureKind) => void
  submitTeam: (name: string, color: string) => void
  startReposition: (ref: LayoutObjectRef) => void
  confirm: () => void
  cancel: () => void
}

type Options = {
  // 配置が成立したことの通知。呼び出し側が「元に戻す」チップを出すのに使う
  onPlaced?: (rect: Rect) => void
  // 閲覧モードから置き始めた時に編集セッションを起こす。冪等であることは呼び出し側が保証する
  onEnsureEditMode: () => void
}

export const useObjectPlacement = (
  editor: UseLayoutEditorApi,
  { onPlaced, onEnsureEditMode }: Options
): ObjectPlacement => {
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
    minSize: request?.minSize,
    siblings,
    isBlocked,
  })

  // 入口はどれも同じ手順で始める。閲覧モードなら先に編集セッションを起こし、
  // 同じフレームでゴースト層まで描けるようにする
  const openCategory = useCallback(() => {
    onEnsureEditMode()
    setFlow({ step: 'category' })
  }, [onEnsureEditMode])

  const selectCategory = useCallback(
    (category: ObjectCategory) => {
      onEnsureEditMode()
      if (category === 'furniture') {
        setFlow({ step: 'furniture-picker' })
        return
      }
      if (category === 'team') {
        setFlow({ step: 'team-form' })
        return
      }
      if (category === 'facility') {
        setFlow({
          step: 'placing',
          request: {
            target: { type: 'add-facility' },
            label: '会議室',
            size: FACILITY_DEFAULT_SIZE,
            minSize: FACILITY_MIN_SIZE,
            initialRect: null,
            resizable: true,
            outline: 'solid',
            selfRef: null,
          },
        })
      }
    },
    [onEnsureEditMode]
  )

  const selectFurniture = useCallback(
    (kind: FurnitureKind) => {
      onEnsureEditMode()
      setFlow({
        step: 'placing',
        request: {
          target: { type: 'add-furniture', furnitureKind: kind },
          label: FURNITURE_KIND_LABEL[kind],
          size: FURNITURE_DEFAULT_SIZE[kind],
          minSize: FURNITURE_MIN_SIZE,
          initialRect: null,
          resizable: true,
          outline: 'solid',
          selfRef: null,
        },
      })
    },
    [onEnsureEditMode]
  )

  // チームの枠は座席数で決まるので、ゴーストでは引き伸ばさせない(破線・リサイズ不可)
  const submitTeam = useCallback(
    (name: string, color: string) => {
      onEnsureEditMode()
      setFlow({
        step: 'placing',
        request: {
          target: { type: 'add-team', name, color },
          label: name,
          size: TEAM_DEFAULT_SIZE,
          minSize: TEAM_DEFAULT_SIZE,
          initialRect: null,
          resizable: false,
          outline: 'dashed',
          selfRef: null,
        },
      })
    },
    [onEnsureEditMode]
  )

  // 既存オブジェクトを現在位置・現在サイズのゴーストで掴み直す
  const startReposition = useCallback(
    (ref: LayoutObjectRef) => {
      if (!layout) return
      const rect = rectOfRef(layout, ref)
      if (!rect) return
      const name =
        ref.kind === 'facility'
          ? layout.facilities.find((f) => f.id === ref.id)?.name ?? '会議室'
          : layout.furniture.find((f) => f.id === ref.id)?.name || '家具'
      setFlow({
        step: 'placing',
        request: {
          target: { type: 'reposition', ref },
          label: name,
          size: { width: rect.w, height: rect.h },
          minSize: ref.kind === 'facility' ? FACILITY_MIN_SIZE : FURNITURE_MIN_SIZE,
          initialRect: rect,
          resizable: true,
          outline: 'solid',
          selfRef: ref,
        },
      })
    },
    [layout]
  )

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
          : target.type === 'add-team'
            ? editor.addTeam(target.name, target.color, rect)
            : target.type === 'reposition'
              ? editor.resizeObject(target.ref, rect)
              : false
    if (!ok) return
    setFlow({ step: 'idle' })
    onPlaced?.(rect)
  }, [request, placement, editor, onPlaced])

  return useMemo(
    () => ({
      isActive: flow.step !== 'idle',
      isCategoryOpen: flow.step === 'category',
      isFurniturePickerOpen: flow.step === 'furniture-picker',
      isTeamFormOpen: flow.step === 'team-form',
      request,
      repositioningRef: request?.target.type === 'reposition' ? request.target.ref : null,
      placement,
      openCategory,
      selectCategory,
      selectFurniture,
      submitTeam,
      startReposition,
      confirm,
      cancel,
    }),
    [
      flow.step,
      request,
      placement,
      openCategory,
      selectCategory,
      selectFurniture,
      submitTeam,
      startReposition,
      confirm,
      cancel,
    ]
  )
}
