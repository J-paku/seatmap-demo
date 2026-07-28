import useSWR from 'swr'
import type { Employee, Facility, ScheduleEvent, Seat, SeatLayout, Team } from './types'
import { fetchMock } from './fetch-mock'
import employeesJson from '../mocks/employees.json'
import teamsJson from '../mocks/teams.json'
import seatsJson from '../mocks/seats.json'
import facilitiesJson from '../mocks/facilities.json'
import schedulesJson from '../mocks/schedules.json'

// JSON 由来の緩い型を、union フィールドを持つ確定型へ整形(このファイルが唯一の import 点)
const EMPLOYEES: Employee[] = employeesJson.map((e) => ({
  ...e,
  avatar: e.avatar as Employee['avatar'],
}))
const TEAMS: Team[] = teamsJson
const SEATS: Seat[] = seatsJson.map((s) => ({
  ...s,
  rotation: s.rotation as Seat['rotation'],
  employeeId: s.employeeId as string | null,
}))
const FACILITIES: Facility[] = facilitiesJson.map((f) => ({
  ...f,
  kind: f.kind as Facility['kind'],
}))
const SCHEDULES: ScheduleEvent[] = schedulesJson.map((s) => ({
  ...s,
  category: s.category as ScheduleEvent['category'],
}))

// デモは 1フロア固定
const FLOOR_ID = 'floor-1'
const FLOOR_NAME = '本社1F'
const VIEWBOX = { width: 1600, height: 900 }

// 各データの SWR フック(キーは mock/ 接頭辞固定・revalidate 既定)
export const useEmployees = () =>
  useSWR('mock/employees', () => fetchMock(EMPLOYEES))

export const useTeams = () => useSWR('mock/teams', () => fetchMock(TEAMS))

export const useSeats = () => useSWR('mock/seats', () => fetchMock(SEATS))

export const useFacilities = () =>
  useSWR('mock/facilities', () => fetchMock(FACILITIES))

export const useSchedules = () =>
  useSWR('mock/schedules', () => fetchMock(SCHEDULES))

// SeatLayout はローダーが teams+seats+facilities を合成
export const useSeatLayout = () => {
  const { data: teams } = useTeams()
  const { data: seats } = useSeats()
  const { data: facilities } = useFacilities()
  const layout: SeatLayout | undefined =
    teams && seats && facilities
      ? {
          floorId: FLOOR_ID,
          floorName: FLOOR_NAME,
          viewBox: VIEWBOX,
          seats,
          teams,
          facilities,
        }
      : undefined
  return { layout, isLoading: !layout }
}
