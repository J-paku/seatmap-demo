import type { Facility, FacilityMeeting, FacilityStatus } from './types'

// まもなく判定の窓(分)
const UPCOMING_WINDOW_MIN = 30

export type FacilityState = {
  status: FacilityStatus
  current?: FacilityMeeting
  next?: FacilityMeeting
}

// 状態別カラー(10-main-interactions 正本・light literal)
export const FACILITY_COLOR: Record<FacilityStatus, { bg: string; border: string; text: string }> = {
  available: { bg: '#e8fcf0', border: '#a7f3d0', text: '#15803d' },
  in_meeting: { bg: '#eef2ff', border: '#a5b4fc', text: '#4338ca' },
  upcoming: { bg: '#fff8e1', border: '#fcd34d', text: '#92400e' },
  unlinked: { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8' },
}

// facilityId + 会議 + 現在時刻(分)から状態を導出
export const deriveFacilityState = (
  facility: Facility,
  meetings: FacilityMeeting[],
  nowMin: number
): FacilityState => {
  if (!facility.facilityId) return { status: 'unlinked' }
  const mine = meetings
    .filter((m) => m.facilityId === facility.facilityId)
    .sort((a, b) => a.startMin - b.startMin)
  const current = mine.find((m) => m.startMin <= nowMin && nowMin < m.endMin)
  const next = mine.find((m) => m.startMin > nowMin)
  if (current) return { status: 'in_meeting', current, next }
  if (next && next.startMin - nowMin <= UPCOMING_WINDOW_MIN) return { status: 'upcoming', next }
  return { status: 'available', next }
}

// 分 → HH:mm
export const minToHHMM = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
