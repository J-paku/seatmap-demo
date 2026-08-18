import { useCallback, useMemo, useState } from 'react'
import type { GhostRequest } from '@/components/GhostPlacementLayer'
import type { ObjectCategory } from '@/components/ObjectCategorySheet'
import { siblingRectsForObject } from '@/components/SeatMapCanvas/utils/sibling-rects'
import { SEATMAP_BG_ID } from '@/components/SheetShell'
import { useGhostPlacement } from '@/hooks/use-ghost-placement'
import type { GhostPlacement } from '@/hooks/use-ghost-placement'
import type { GaroonFacility } from '@/lib/garoon/facilities'
import { MSG_OVERLAP } from '@/hooks/use-layout-editor/use-layout-editor'
import type { UseLayoutEditorApi } from '@/hooks/use-layout-editor/use-layout-editor'
import { FURNITURE_DEFAULT_SIZE, FURNITURE_KIND_LABEL } from '@/utils/furniture-catalog'
import { rectOfRef } from '@/utils/layout/layout-objects'
import { lockedMessage, placementBlockReason } from '@/utils/layout/layout-rules'
import { GHOST_MIN_SIZE } from '@/utils/layout/rect'
import type { Rect } from '@/utils/layout/rect'
import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH } from '@/utils/layout/seat-relayout'
import { NEW_TEAM_AREA_SIZE } from '@/utils/layout/team-create-grid'
import { buildTeamImportPlan } from '@/utils/layout/team-import'
import type { TeamImportSource } from '@/utils/layout/team-import'
import type { FurnitureKind, LayoutObjectRef } from '@/types'

// 追加導線の状態機械。カテゴリ → (家具なら)ピッカー → ゴースト → 確定。
// ゴーストの幾何は use-ghost-placement、置けるかどうかの規則は utils/layout/layout-rules が持ち、
// ここは「今どの段にいるか」と「確定したら何を発行するか」だけを持つ。
// メニューの開閉は FAB 側(useAdminAddFab)の持ち物なのでここには無い

// 会議室の既定サイズ
const FACILITY_DEFAULT_SIZE = { width: 200, height: 150 }
// 配置していない間に渡す寸法。参照を固定しないとゴースト側の初期化が毎レンダー走る
const IDLE_SIZE = { width: 0, height: 0 }
// 会議室は座席1つ分より小さくしない。家具は共通の最小辺まで縮められる
const FACILITY_MIN_SIZE = { width: DEFAULT_SEAT_WIDTH, height: DEFAULT_SEAT_HEIGHT }
const FURNITURE_MIN_SIZE = { width: GHOST_MIN_SIZE, height: GHOST_MIN_SIZE }
// §02-3: 取り込みのアンカーはビューポート中央のSVG座標。実測が取れないときの
// フォールバックだけは原典転記の固定値を使う
const IMPORT_ANCHOR_FALLBACK = { x: 960, y: 540 }

// §02-3 のアンカー実測。ゴーストと同じ経路(キャンバス矩形 + 変換層の transform)で読む。
// キャンバス内部の ref ではなく DOM フックを見るのは、この導線がキャンバスの外に居るため
const viewportCenterAnchor = (): { x: number; y: number } => {
  const canvas = document.getElementById(SEATMAP_BG_ID)
  const layer = document.querySelector<HTMLElement>('[data-canvas-transform-layer="true"]')
  if (!canvas || !layer) return IMPORT_ANCHOR_FALLBACK
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return IMPORT_ANCHOR_FALLBACK
  const matrix = new DOMMatrixReadOnly(getComputedStyle(layer).transform)
  const scale = matrix.a || 1
  return { x: (rect.width / 2 - matrix.e) / scale, y: (rect.height / 2 - matrix.f) / scale }
}

// §02-2 の順序: チームカテゴリ → ゴースト配置 → 「配置」 → 名前/色ダイアログ → 「作成」。
// team-form は位置が決まった後の段なので、確定済みの矩形を持って進む
type PlacementFlow =
  | { step: 'idle' }
  | { step: 'category' }
  | { step: 'furniture-picker' }
  // §03-3: 施設はマスタから1件選んでからゴーストへ進む
  | { step: 'facility-picker' }
  | { step: 'team-category' }
  // §02-3: 取り込みはゴーストを通らない。シートで選んだ分をまとめて自動配置する
  | { step: 'team-import' }
  | { step: 'team-form'; rect: Rect }
  | { step: 'placing'; request: GhostRequest }

export type ObjectPlacement = {
  // idle でない = 追加導線のどこかに居る
  isActive: boolean
  isCategoryOpen: boolean
  isFurniturePickerOpen: boolean
  isFacilityPickerOpen: boolean
  isTeamCategoryOpen: boolean
  isTeamImportOpen: boolean
  isTeamFormOpen: boolean
  request: GhostRequest | null
  // ゴーストで掴み直し中の対象。キャンバス側が実体を淡く描くのに使う
  repositioningRef: LayoutObjectRef | null
  placement: GhostPlacement
  openCategory: () => void
  selectCategory: (category: ObjectCategory) => void
  selectFurniture: (kind: FurnitureKind) => void
  selectFacility: (facility: GaroonFacility) => void
  startTeamCreate: () => void
  startTeamImport: () => void
  submitTeamImport: (sources: TeamImportSource[]) => void
  submitTeam: (name: string, color: string) => void
  startReposition: (ref: LayoutObjectRef) => void
  confirm: () => void
  cancel: () => void
}

type Options = {
  // 配置が成立したことの通知。呼び出し側が「元に戻す」チップを出すのに使う
  onPlaced?: (rect: Rect, targetType: GhostRequest['target']['type']) => void
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

  const blockReason = useCallback(
    (rect: Rect) => (layout ? placementBlockReason(layout, selfRef, rect) : null),
    [layout, selfRef]
  )

  const placement = useGhostPlacement({
    active: request !== null,
    size: request?.size ?? IDLE_SIZE,
    initialRect: request?.initialRect ?? null,
    resizable: request?.resizable ?? false,
    minSize: request?.minSize,
    siblings,
    blockReason,
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
        // §02-1: チームは「既存から取り込み / 新規作成」の2択を挟む
        setFlow({ step: 'team-category' })
        return
      }
      if (category === 'facility') {
        // §03-3: どの施設かはピッカーで決める。ここではゴーストを開かない
        setFlow({ step: 'facility-picker' })
      }
    },
    [onEnsureEditMode]
  )

  // §03-3: 選んだ施設のままゴーストへ進む(200×150)。名前と施設IDは確定時まで request が運ぶ
  const selectFacility = useCallback(
    (facility: GaroonFacility) => {
      onEnsureEditMode()
      setFlow({
        step: 'placing',
        request: {
          target: { type: 'add-facility', facility },
          label: facility.name,
          size: FACILITY_DEFAULT_SIZE,
          minSize: FACILITY_MIN_SIZE,
          initialRect: null,
          // §04-4: リサイズできるのは施設の移動モードだけ。新規作成では既定サイズのまま置く
          resizable: false,
          outline: 'solid',
          selfRef: null,
        },
      })
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
          // §04-4: 家具はリサイズ対象外(施設の移動モードのみ)
          resizable: false,
          outline: 'solid',
          selfRef: null,
        },
      })
    },
    [onEnsureEditMode]
  )

  // §02-2: 新規作成はまずゴーストで位置を決める。名前と色はこの時点では未定なので、
  // target の name/color は空のまま持つ(確定時に読まず、ダイアログの入力を使う)
  const startTeamCreate = useCallback(() => {
    onEnsureEditMode()
    setFlow({
      step: 'placing',
      request: {
        target: { type: 'add-team', name: '', color: '' },
        label: 'チーム',
        // チームの枠は 2行4列の座席で決まるので、ゴーストでは引き伸ばさせない(破線・リサイズ不可)
        size: NEW_TEAM_AREA_SIZE,
        minSize: NEW_TEAM_AREA_SIZE,
        initialRect: null,
        resizable: false,
        outline: 'dashed',
        selfRef: null,
      },
    })
  }, [onEnsureEditMode])

  // §02-3: 取り込みはゴーストを挟まない。位置はシートの「確定」の時点で自動探索する
  const startTeamImport = useCallback(() => {
    onEnsureEditMode()
    setFlow({ step: 'team-import' })
  }, [onEnsureEditMode])

  // §02-3 の「確定 (n件)」。採番・ラベル重複回避・スパイラル探索は utils/layout/team-import が持ち、
  // ここは実測アンカーを渡して結果を1アクションで積むだけ(undo 1回で取り込み全体が戻る)
  const submitTeamImport = useCallback(
    (sources: TeamImportSource[]) => {
      const current = editor.editingLayout
      if (!current) return
      const plan = buildTeamImportPlan(current, sources, viewportCenterAnchor())
      if (plan.teams.length > 0) editor.importTeams(plan.teams, plan.seats)
      setFlow({ step: 'idle' })
      // 3段とも尽きた分だけ警告する。0件でも取り込み自体は成立するので閉じ方は変えない
      if (plan.unplacedCount > 0) {
        editor.showError(`空き領域が足りないため${plan.unplacedCount}件のチームを配置できませんでした`)
      }
    },
    [editor]
  )

  // §02-2: ダイアログの「作成」。位置は「配置」で確定済みなので、ここで初めてチームを生成する
  const submitTeam = useCallback(
    (name: string, color: string) => {
      if (flow.step !== 'team-form') return
      const { rect } = flow
      if (!editor.addTeam(name, color, rect)) return
      setFlow({ step: 'idle' })
      onPlaced?.(rect, 'add-team')
    },
    [flow, editor, onPlaced]
  )

  // §05-3: チーム枠・会議室・家具のタップで開く移動ゴースト。
  // 実体はその場に残し、確定するまで一切動かさない(掴み直しの間だけ実体を淡く描くのはキャンバス側)
  const startReposition = useCallback(
    (ref: LayoutObjectRef) => {
      if (!layout) return
      const rect = rectOfRef(layout, ref)
      if (!rect) return
      // §05-3: locked / fixedLayout は移動そのものを開始させない。
      // 黙って無視すると「タップが効かない」としか見えないので必ず理由を通知する
      const locked = lockedMessage(layout, ref, '移動')
      if (locked) {
        editor.showError(locked)
        return
      }
      const name =
        ref.kind === 'team'
          ? layout.teams.find((t) => t.id === ref.id)?.name ?? 'チーム'
          : ref.kind === 'facility'
            ? layout.facilities.find((f) => f.id === ref.id)?.name ?? '会議室'
            : layout.furniture.find((f) => f.id === ref.id)?.name || '家具'
      setFlow({
        step: 'placing',
        request: {
          target: { type: 'reposition', ref },
          label: name,
          size: { width: rect.w, height: rect.h },
          minSize:
            ref.kind === 'facility'
              ? FACILITY_MIN_SIZE
              : ref.kind === 'team'
                ? { width: rect.w, height: rect.h }
                : FURNITURE_MIN_SIZE,
          initialRect: rect,
          // §04-4 のリサイズ可能条件。原典は kind==='furniture' && furnitureKind==='facility' だが、
          // このリポジトリは会議室を別型 Facility で持つ(DECISION D1)ため「施設の移動モード」で判定する。
          // チーム枠のリサイズはハンドルドラッグ(枠に対する操作)で行う仕様なのでゴーストでは広げない
          resizable: ref.kind === 'facility',
          outline: ref.kind === 'team' ? 'dashed' : 'solid',
          selfRef: ref,
        },
      })
    },
    [layout, editor]
  )

  const cancel = useCallback(() => setFlow({ step: 'idle' }), [])

  const confirm = useCallback(() => {
    if (!request) return
    const rect = placement.commit()
    if (!rect) return
    // 描画時の判定と指を離す瞬間の間に地図が動くと、commit() の再吸着で矩形がずれる。
    // 誰も判定していない矩形を発行しないよう、発行の直前に同じ規則へもう一度通す
    if (blockReason(rect)) {
      editor.showError(MSG_OVERLAP)
      return
    }
    const { target } = request
    // §02-2: チームは「配置」で位置だけを確定し、生成はダイアログの「作成」まで待つ
    if (target.type === 'add-team') {
      setFlow({ step: 'team-form', rect })
      return
    }
    // 失敗(重なりなど)ならゴーストを開いたままにして、位置を直せるようにする
    // チーム枠は所属座席ごと動かす必要があるので team-move へ回す。
    // object-resize は会議室・家具しか触れない(EditableObjectKind)ため、ここで分ける
    const ok =
      target.type === 'add-furniture'
        ? editor.addFurniture(target.furnitureKind, rect)
        : target.type === 'add-facility'
          ? editor.addFacility(rect, target.facility)
          : target.type === 'reposition'
            ? target.ref.kind === 'team'
              ? editor.moveTeam(target.ref.id, rect.x, rect.y)
              : editor.resizeObject(target.ref, rect)
            : false
    if (!ok) return
    setFlow({ step: 'idle' })
    onPlaced?.(rect, target.type)
  }, [request, placement, editor, onPlaced, blockReason])

  return useMemo(
    () => ({
      isActive: flow.step !== 'idle',
      isCategoryOpen: flow.step === 'category',
      isFurniturePickerOpen: flow.step === 'furniture-picker',
      isFacilityPickerOpen: flow.step === 'facility-picker',
      isTeamCategoryOpen: flow.step === 'team-category',
      isTeamImportOpen: flow.step === 'team-import',
      isTeamFormOpen: flow.step === 'team-form',
      request,
      repositioningRef: request?.target.type === 'reposition' ? request.target.ref : null,
      placement,
      openCategory,
      selectCategory,
      selectFurniture,
      selectFacility,
      startTeamCreate,
      startTeamImport,
      submitTeamImport,
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
      selectFacility,
      startTeamCreate,
      startTeamImport,
      submitTeamImport,
      submitTeam,
      startReposition,
      confirm,
      cancel,
    ]
  )
}
