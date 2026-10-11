import { EditObjectLayer } from './EditObjectLayer'
import { TeamAreaLayer } from './TeamAreaLayer'
import type { CanvasViewModel } from '../hooks/use-canvas-view-model'
import type { EditDragState } from '../hooks/use-edit-drag'
import type { SeatMapCanvasProps, Viewport } from '../type'
import { FacilityBlock } from '@/components/FacilityBlock'
import { FurnitureBlock } from '@/components/FurnitureBlock'
import type { LayoutObjectRef, SeatLayout } from '@/types'
import styles from '@/components/seatmap.module.css'

// パン・ズームで一括変換される唯一のレイヤーと、その上に描くチーム箱・施設・家具・編集操作面

type Props = Pick<
  SeatMapCanvasProps,
  'facilityStateById' | 'onFacilitySelect' | 'onFacilityHover' | 'onEnterEditSession' | 'canUndo'
> & {
  layerRef: Viewport['layerRef']
  layout: SeatLayout
  view: Pick<
    CanvasViewModel,
    'assignedCountByTeam' | 'lod' | 'counterScale' | 'handleTeamBoundaryOpen'
  >
  edit: Pick<
    EditDragState,
    | 'editSelectedObject'
    | 'undoChip'
    | 'onTeamLabelEditPointerDown'
    | 'onTeamEditTap'
    | 'onObjectEditPointerDown'
    | 'onObjectEditTap'
  >
  isEditMode: boolean
  repositioningRef: LayoutObjectRef | null
}

export const TransformLayer = ({
  layerRef,
  layout,
  view,
  edit,
  isEditMode,
  repositioningRef,
  canUndo,
  facilityStateById,
  onFacilitySelect,
  onFacilityHover,
  onEnterEditSession,
}: Props) => (
  <div ref={layerRef} className={styles.seatMapTransform} data-canvas-transform-layer='true'>
    {/* z順: チームエリア → 施設/通路 → 設備の編集操作面。編集セッション中も座席は描かない
      (キャンバス = 通路線 + チーム箱 + 家具/会議室。CLAUDE.md 不変ルール1・仕様 00-2) */}
    <TeamAreaLayer
      teams={layout.teams}
      assignedCountByTeam={view.assignedCountByTeam}
      lod={view.lod}
      isEditMode={isEditMode}
      onBoundaryOpen={view.handleTeamBoundaryOpen}
      onLabelEditPointerDown={edit.onTeamLabelEditPointerDown}
      onEditTap={edit.onTeamEditTap}
      onLongPressEditSession={isEditMode ? undefined : onEnterEditSession}
    />
    {layout.facilities.map(f => (
      <FacilityBlock
        key={f.id}
        facility={f}
        counterScale={view.counterScale}
        onSelect={facilityId => {
          // 編集モードでは詳細パネルを開かない。選択は上の EditObjectLayer が受ける
          if (!isEditMode) onFacilitySelect?.(facilityId)
        }}
        state={facilityStateById?.get(f.id)}
        lod={view.lod}
        onHover={isEditMode ? undefined : onFacilityHover}
      />
    ))}
    {layout.furniture.map(f => (
      <FurnitureBlock
        key={f.id}
        furniture={f}
        counterScale={view.counterScale}
        onLongPressEditSession={isEditMode ? undefined : onEnterEditSession}
      />
    ))}
    {isEditMode && (
      <EditObjectLayer
        facilities={layout.facilities}
        furniture={layout.furniture}
        selected={edit.editSelectedObject}
        repositioning={repositioningRef}
        recent={canUndo ? edit.undoChip.recent : null}
        onEditPointerDown={edit.onObjectEditPointerDown}
        onEditTap={edit.onObjectEditTap}
      />
    )}
  </div>
)
