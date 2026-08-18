import type { ObjectPlacement } from '../hooks/use-object-placement'
import { FacilityPickerModal } from '@/components/FacilityPickerModal'
import { FurniturePickerModal } from '@/components/FurniturePickerModal'
import { GhostPlacementLayer } from '@/components/GhostPlacementLayer'
import { ObjectCategorySheet } from '@/components/ObjectCategorySheet'
import { TeamCategorySheet } from '@/components/TeamCategorySheet'
import { TeamCreatePopover } from '@/components/TeamCreatePopover'
import { TeamImportSheet } from '@/components/TeamImportSheet'
import { isGaroonConnected } from '@/lib/garoon/facilities'

// 追加導線の面(分類シート・各ピッカー・チーム系ダイアログ・ゴースト層)をまとめて描く。
//
// どれも閲覧モードでも常設する。編集モードの内側へ置くと、セッション起動と同じフレームで
// 描かれず1フレーム空く。ゴースト層はキャンバスの DOM 木の外に置く —
// 中に入れると暗幕がキャンバスの pointerdown を奪い、配置中にパン/ズームできなくなる

type Props = {
  placement: ObjectPlacement
  // §03-3 配置済み判定の材料(Facility.facilityId の一覧)
  placedFacilityIds: readonly string[]
  // 削除確認が開いている間。バーの削除ボタンを二度押しさせない
  isGhostDeleting: boolean
  // 移動モードのときだけ渡す。新規配置では削除ボタンを出さない
  onGhostDelete?: () => void
}

export const PlacementSheets = ({ placement, placedFacilityIds, isGhostDeleting, onGhostDelete }: Props) => (
  <>
    <ObjectCategorySheet
      isOpen={placement.isCategoryOpen}
      categories={['furniture', 'facility']}
      isGaroonConnected={isGaroonConnected()}
      onSelect={placement.selectCategory}
      onClose={placement.cancel}
    />
    <FurniturePickerModal
      isOpen={placement.isFurniturePickerOpen}
      onSelect={placement.selectFurniture}
      onClose={placement.cancel}
    />
    {/* §03-3: 施設は Garoon マスタから選んでからゴーストへ進む */}
    <FacilityPickerModal
      isOpen={placement.isFacilityPickerOpen}
      placedFacilityIds={placedFacilityIds}
      onSelect={placement.selectFacility}
      onClose={placement.cancel}
    />
    <TeamCategorySheet
      isOpen={placement.isTeamCategoryOpen}
      onSelectImport={placement.startTeamImport}
      onSelectCreate={placement.startTeamCreate}
      onClose={placement.cancel}
    />
    {/* §02-3: 取り込みはゴーストを通らず、確定時にスパイラル探索でまとめて置く */}
    <TeamImportSheet
      isOpen={placement.isTeamImportOpen}
      onConfirm={placement.submitTeamImport}
      onClose={placement.cancel}
    />
    {/* §02-2: 名前/色ダイアログはゴーストの「配置」で位置が決まった後に開く */}
    <TeamCreatePopover isOpen={placement.isTeamFormOpen} onSubmit={placement.submitTeam} onClose={placement.cancel} />
    {placement.request && (
      <GhostPlacementLayer
        request={placement.request}
        placement={placement.placement}
        isDeleting={isGhostDeleting}
        onConfirm={placement.confirm}
        onCancel={placement.cancel}
        onDelete={onGhostDelete}
      />
    )}
  </>
)
