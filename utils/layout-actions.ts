// 07-admin-edit: レイアウト編集のアクション定義と純粋リデューサー(副作用なし)
import { defaultFurnitureName } from './furniture-catalog'
import { RELAYOUT_COL_GAP, RELAYOUT_PADDING, DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH, fitAreaToSeats, relayoutSeatsInGrid, sortSeatsForRelayout } from './seat-relayout'
import type { Facility, Furniture, FurnitureKind, Seat, SeatLayout, Team } from '@/types'

// 移動・リサイズ・削除の扱いが完全に同じ2種。座席(重なると入れ替え)とチーム
// (所属座席ごと動く)は挙動が違うので、ここへ混ぜない。union を2種に絞ることで
// 後から座席・チームを同じ経路へ流し込めないようにしている
export type EditableObjectKind = 'facility' | 'furniture'

export type LayoutAction =
  | { type: 'seat-move'; seatId: string; x: number; y: number }
  | { type: 'seat-add'; teamId: string; x?: number; y?: number }
  | { type: 'seat-delete'; seatId: string }
  | { type: 'seat-assign'; seatId: string; teamId: string }
  | { type: 'seat-swap'; fromSeatId: string; toSeatId: string }
  // 社員の配属。同じ社員が座っていた席は空け、席が埋まっていれば入れ替える。
  // 配属・交替・移動・入れ替えの4通りをこの1アクションで表す(分岐を呼び出し側に散らさない)
  | { type: 'seat-assign-employee'; seatId: string; employeeId: string | null }
  | { type: 'team-move'; teamId: string; x: number; y: number }
  | { type: 'team-relayout'; teamId: string; rows: number; cols: number }
  // idPrefix は座席IDの結束キーなので、衝突しない値をリデューサー側で採番する
  | { type: 'team-add'; name: string; color: string; x: number; y: number; width: number; height: number }
  | { type: 'facility-add'; x: number; y: number; width: number; height: number }
  | { type: 'furniture-add'; furnitureKind: FurnitureKind; x: number; y: number; width: number; height: number }
  // id はレイアウト上の Facility.id / Furniture.id。予定システム側の Facility.facilityId ではない
  | { type: 'object-move'; kind: EditableObjectKind; id: string; x: number; y: number }
  | { type: 'object-resize'; kind: EditableObjectKind; id: string; x: number; y: number; width: number; height: number }
  | { type: 'object-delete'; kind: EditableObjectKind; id: string }

// 対象チームの idPrefix を正規表現用にエスケープ
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// 次の座席id(11: id形式は '${idPrefix}-NNN'。対象チームの既存連番の最大値+1を3桁ゼロ埋めで採番)
const nextSeatId = (seats: Seat[], idPrefix: string): string => {
  const pattern = new RegExp(`^${escapeRegExp(idPrefix)}-(\\d+)$`)
  let max = 0
  for (const s of seats) {
    const m = pattern.exec(s.id)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${idPrefix}-${String(max + 1).padStart(3, '0')}`
}

// 連番id の採番(既存の最大値+1)。座席と同じ方式を会議室・家具へも使う
const nextSequentialId = (ids: string[], prefix: string, pad: number): string => {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`)
  let max = 0
  for (const id of ids) {
    const m = pattern.exec(id)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}${String(max + 1).padStart(pad, '0')}`
}

type BoxPatch = { x?: number; y?: number; width?: number; height?: number }

// 会議室・家具の共通更新。対象が居なければ元のレイアウトをそのまま返す(undo を積ませない)
const patchObject = (
  layout: SeatLayout,
  kind: EditableObjectKind,
  id: string,
  patch: BoxPatch
): SeatLayout => {
  if (kind === 'facility') {
    if (!layout.facilities.some((f) => f.id === id)) return layout
    return { ...layout, facilities: layout.facilities.map((f) => (f.id === id ? { ...f, ...patch } : f)) }
  }
  if (!layout.furniture.some((f) => f.id === id)) return layout
  return { ...layout, furniture: layout.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)) }
}

export const applyLayoutAction = (layout: SeatLayout, action: LayoutAction): SeatLayout => {
  switch (action.type) {
    case 'seat-move': {
      const seat = layout.seats.find((s) => s.id === action.seatId)
      if (!seat) return layout
      return {
        ...layout,
        seats: layout.seats.map((s) => (s.id === action.seatId ? { ...s, x: action.x, y: action.y } : s)),
      }
    }
    case 'seat-add': {
      const team = layout.teams.find((t) => t.id === action.teamId)
      if (!team) return layout
      const teamSeats = layout.seats.filter((s) => s.teamId === action.teamId)
      let x = action.x
      let y = action.y
      if (x === undefined || y === undefined) {
        const last = sortSeatsForRelayout(teamSeats)[teamSeats.length - 1]
        if (last) {
          x = last.x + last.width + RELAYOUT_COL_GAP
          y = last.y
        } else {
          x = team.area.x + RELAYOUT_PADDING
          y = team.area.y + RELAYOUT_PADDING
        }
      }
      const newSeat: Seat = {
        id: nextSeatId(layout.seats, team.idPrefix),
        teamId: action.teamId,
        x,
        y,
        width: DEFAULT_SEAT_WIDTH,
        height: DEFAULT_SEAT_HEIGHT,
        rotation: 0,
        employeeId: null,
      }
      const seats = [...layout.seats, newSeat]
      // 追加席が area からはみ出す場合に備えて area を座席群へ合わせ直す
      const fitted = fitAreaToSeats(seats.filter((s) => s.teamId === action.teamId), team.area)
      return {
        ...layout,
        seats,
        teams: layout.teams.map((t) => (t.id === action.teamId ? { ...t, area: fitted } : t)),
      }
    }
    case 'seat-assign-employee': {
      const target = layout.seats.find((s) => s.id === action.seatId)
      if (!target) return layout
      if (target.employeeId === action.employeeId) return layout
      // その社員が既に座っている席(あれば)。移動元には移動先の元の人が入る
      const from = action.employeeId
        ? layout.seats.find((s) => s.employeeId === action.employeeId && s.id !== action.seatId)
        : undefined
      const displaced = target.employeeId
      return {
        ...layout,
        seats: layout.seats.map((s) => {
          if (s.id === target.id) return { ...s, employeeId: action.employeeId }
          if (from && s.id === from.id) return { ...s, employeeId: displaced }
          return s
        }),
      }
    }
    case 'seat-delete': {
      if (!layout.seats.some((s) => s.id === action.seatId)) return layout
      return { ...layout, seats: layout.seats.filter((s) => s.id !== action.seatId) }
    }
    case 'seat-assign': {
      const seat = layout.seats.find((s) => s.id === action.seatId)
      if (!seat) return layout
      return {
        ...layout,
        seats: layout.seats.map((s) => (s.id === action.seatId ? { ...s, teamId: action.teamId } : s)),
      }
    }
    case 'seat-swap': {
      const from = layout.seats.find((s) => s.id === action.fromSeatId)
      const to = layout.seats.find((s) => s.id === action.toSeatId)
      if (!from || !to) return layout
      return {
        ...layout,
        seats: layout.seats.map((s) => {
          if (s.id === from.id) return { ...s, employeeId: to.employeeId }
          if (s.id === to.id) return { ...s, employeeId: from.employeeId }
          return s
        }),
      }
    }
    case 'team-move': {
      const team = layout.teams.find((t) => t.id === action.teamId)
      if (!team) return layout
      const dx = action.x - team.area.x
      const dy = action.y - team.area.y
      return {
        ...layout,
        teams: layout.teams.map((t) =>
          t.id === action.teamId ? { ...t, area: { ...t.area, x: action.x, y: action.y } } : t
        ),
        seats: layout.seats.map((s) =>
          s.teamId === action.teamId ? { ...s, x: s.x + dx, y: s.y + dy } : s
        ),
      }
    }
    case 'team-relayout': {
      const team = layout.teams.find((t) => t.id === action.teamId)
      if (!team) return layout
      const teamSeats = layout.seats.filter((s) => s.teamId === action.teamId)
      if (teamSeats.length === 0) return layout
      const relaid = relayoutSeatsInGrid(teamSeats, team.area, action.rows, action.cols)
      const fitted = fitAreaToSeats(relaid, team.area)
      const relaidById = new Map(relaid.map((s) => [s.id, s]))
      return {
        ...layout,
        teams: layout.teams.map((t) => (t.id === action.teamId ? { ...t, area: fitted } : t)),
        seats: layout.seats.map((s) => relaidById.get(s.id) ?? s),
      }
    }
    case 'team-add': {
      // idPrefix が既存と衝突すると座席IDの結束が壊れて席が混ざる。空いている連番まで送る
      const takenPrefixes = new Set(layout.teams.map((t) => t.idPrefix))
      let index = layout.teams.length + 1
      let idPrefix = `team-${String(index).padStart(2, '0')}`
      while (takenPrefixes.has(idPrefix)) {
        index += 1
        idPrefix = `team-${String(index).padStart(2, '0')}`
      }
      const added: Team = {
        id: nextSequentialId(layout.teams.map((t) => t.id), 'team-', 2),
        idPrefix,
        name: action.name,
        // かな検索用。日本語名からは機械的に導けないので名前をそのまま入れておく
        kana: action.name,
        color: action.color,
        area: { x: action.x, y: action.y, w: action.width, h: action.height },
      }
      return { ...layout, teams: [...layout.teams, added] }
    }
    case 'facility-add': {
      // 新設の会議室は予定システムと未連携(facilityId なし)。デモとして嘘をつかない
      const meetingCount = layout.facilities.filter((f) => f.kind === 'meeting').length
      const added: Facility = {
        id: nextSequentialId(layout.facilities.map((f) => f.id), 'fac-', 2),
        name: `会議室${meetingCount + 1}`,
        kind: 'meeting',
        x: action.x,
        y: action.y,
        width: action.width,
        height: action.height,
      }
      return { ...layout, facilities: [...layout.facilities, added] }
    }
    case 'furniture-add': {
      const added: Furniture = {
        id: nextSequentialId(layout.furniture.map((f) => f.id), 'furn-', 3),
        kind: action.furnitureKind,
        name: defaultFurnitureName(action.furnitureKind),
        x: action.x,
        y: action.y,
        width: action.width,
        height: action.height,
        rotation: 0,
      }
      return { ...layout, furniture: [...layout.furniture, added] }
    }
    case 'object-move':
      return patchObject(layout, action.kind, action.id, { x: action.x, y: action.y })
    case 'object-resize':
      return patchObject(layout, action.kind, action.id, {
        x: action.x,
        y: action.y,
        width: action.width,
        height: action.height,
      })
    case 'object-delete': {
      // 照合キーは Facility.id / Furniture.id。facilityId フィールドと紛らわしいので取り違えない
      if (action.kind === 'facility') {
        if (!layout.facilities.some((f) => f.id === action.id)) return layout
        return { ...layout, facilities: layout.facilities.filter((f) => f.id !== action.id) }
      }
      if (!layout.furniture.some((f) => f.id === action.id)) return layout
      return { ...layout, furniture: layout.furniture.filter((f) => f.id !== action.id) }
    }
    default:
      return layout
  }
}
