import { FacilityHoverLayer } from './FacilityHoverLayer'
import type { SeatMapData } from '../hooks/use-seat-map-data'
import type { SeatNavigation } from '../hooks/use-seat-navigation'
import type { SurfaceState } from '../hooks/use-surface-state'
import { facilityDeletedMessage } from '../utils/compose-notice-message'
import { DetailPanels } from '@/components/DetailPanels'
import { TeamOverlay } from '@/components/TeamOverlay'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import type { MinimapPayload } from '@/utils/minimap-payload'

// 閲覧モードで開く面(チームオーバーレイ・会議室のホバーカード・詳細パネル)。
// 編集中は呼び出し側が丸ごと出さない

type Props = {
  data: SeatMapData
  nav: SeatNavigation
  // オーバーレイ内ミニマップ用のフロア情報。オーバーレイが閉じている間は null
  minimap: MinimapPayload | null
  surface: SurfaceState
  showNotice: (message: string) => void
}

export const ViewModePanels = ({
  data: { effectiveLayout, employeeById, effectivePresenceMap, facilityStateById },
  nav: { focus, personSeat, handleGoToSeat },
  minimap,
  surface: { hoverFacility },
  showNotice,
}: Props) => {
  const { openSeatDetail, personDetailId } = useDetailPanel()

  return (
    <>
      {effectiveLayout && (
        <TeamOverlay
          payload={focus.payload}
          seats={effectiveLayout.seats}
          employeeById={employeeById}
          presenceMap={effectivePresenceMap}
          onClose={focus.close}
          onSeatClick={openSeatDetail}
          highlightSeatId={focus.highlightSeatId}
          onClearHighlight={focus.clearHighlight}
          minimapAreas={minimap?.areas}
          minimapFurniture={minimap?.furniture}
          minimapTeamArea={minimap?.currentArea}
          minimapViewBox={minimap?.viewBox}
        />
      )}
      {hoverFacility && effectiveLayout && (
        <FacilityHoverLayer
          hoverFacility={hoverFacility}
          facilities={effectiveLayout.facilities}
          facilityStateById={facilityStateById}
          employeeById={employeeById}
        />
      )}
      <DetailPanels
        onFacilityDeleted={name => showNotice(facilityDeletedMessage(name))}
        onGoToSeat={personSeat ? handleGoToSeat : undefined}
        showSeatUnsetNotice={personDetailId !== null && !personSeat}
      />
    </>
  )
}
