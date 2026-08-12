// 07-admin-edit: レイアウト編集のアクション定義と純粋リデューサー(副作用なし)
import { defaultFurnitureName } from '../furniture-catalog'
import { RELAYOUT_COL_GAP, RELAYOUT_PADDING, DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH, fitAreaToSeats, relayoutSeatsInGrid, sortSeatsForRelayout } from './seat-relayout'
import { applySeatShape } from './seat-shape'
import { newTeamSeatBoxes } from './team-create-grid'
import type { Facility, Furniture, FurnitureKind, Seat, SeatLayout, Team } from '@/types'

// 移動・リサイズ・削除の扱いが完全に同じ2種。座席(重なると入れ替え)とチーム
// (所属座席ごと動く)は挙動が違うので、ここへ混ぜない。union を2種に絞ることで
// 後から座席・チームを同じ経路へ流し込めないようにしている
export type EditableObjectKind = 'facility' | 'furniture'

// 座席形状。既定サイズの適用規則は utils/layout/seat-shape.ts が持つ
export type SeatShape = NonNullable<Seat['shape']>

export type LayoutAction =
  | { type: 'seat-move'; seatId: string; x: number; y: number }
  | { type: 'seat-add'; teamId: string; x?: number; y?: number }
  | { type: 'seat-delete'; seatId: string }
  // 05-4: 選択座席の一括90°時計回り。複数IDを1アクションで持ち、undo 1回でまとめて戻せるようにする
  | { type: 'seat-rotate'; seatIds: string[] }
  // 05-4: 選択座席の一括形状変更(バーの「大型」= 'executive')
  | { type: 'seat-reshape'; seatIds: string[]; shape: SeatShape }
  // 07-2: 2席以上の一括削除。seat-delete を N 回発行すると undo も N 回要るので1アクションにする
  | { type: 'seat-delete-many'; seatIds: string[] }
  | { type: 'seat-assign'; seatId: string; teamId: string }
  | { type: 'seat-swap'; fromSeatId: string; toSeatId: string }
  // 対象チームの座席を丸ごと差し替える。グリッド一括編集・既存チーム取り込みのように
  // 座席が何十件も同時に変わる操作を1アクションにまとめ、undo 1回で元へ戻せるようにする
  | { type: 'seat-replace-all'; teamId: string; seats: Seat[] }
  // 社員の配属。同じ社員が座っていた席は空け、席が埋まっていれば入れ替える。
  // 配属・交替・移動・入れ替えの4通りをこの1アクションで表す(分岐を呼び出し側に散らさない)
  | { type: 'seat-assign-employee'; seatId: string; employeeId: string | null }
  | { type: 'team-move'; teamId: string; x: number; y: number }
  | { type: 'team-relayout'; teamId: string; rows: number; cols: number }
  // idPrefix は座席IDの結束キーなので、衝突しない値をリデューサー側で採番する
  | { type: 'team-add'; name: string; color: string; x: number; y: number; width: number; height: number }
  // チーム配列を丸ごと差し替える。既存チーム取り込みのように複数チームが一度に増える操作を
  // 1アクションにまとめ、undo 1回で全チームが元へ戻るようにする
  | { type: 'team-replace-all'; teams: Team[] }
  // §02-3 既存チーム取り込み。取り込んだチームと、複製した所属座席を同時に積む。
  // team-replace-all はチーム配列しか触らない(座席の後始末は team-delete の担当)ので、
  // 取り込みをそれで書くと座席が別アクションになり undo が2回必要になる。
  // 「undo 1回で取り込み全体が戻る」が仕様なので、両方を1アクションで持つ型をここへ足す
  | { type: 'team-import'; teams: Team[]; seats: Seat[] }
  // チーム1件と、その所属座席を全て削除する
  | { type: 'team-delete'; teamId: string }
  // §03-3: 施設ピッカーで選んだ Garoon マスタの1件。name/facilityId が無ければ
  // 予定システム未連携の会議室として自動採番する
  | { type: 'facility-add'; x: number; y: number; width: number; height: number; name?: string; facilityId?: string }
  | { type: 'furniture-add'; furnitureKind: FurnitureKind; x: number; y: number; width: number; height: number }
  // id はレイアウト上の Facility.id / Furniture.id。予定システム側の Facility.facilityId ではない
  | { type: 'object-move'; kind: EditableObjectKind; id: string; x: number; y: number }
  | { type: 'object-resize'; kind: EditableObjectKind; id: string; x: number; y: number; width: number; height: number }
  | { type: 'object-delete'; kind: EditableObjectKind; id: string }
  // §05-3: 会議室・家具のロックトグル。ロック中は移動・リサイズ・削除を拒む
  | { type: 'object-lock'; kind: EditableObjectKind; id: string; locked: boolean }
  // §05-3: キャンバス上の名前ラベルを描くかどうかのトグル
  | { type: 'object-label-visible'; kind: EditableObjectKind; id: string; labelVisible: boolean }

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

// 連番id の採番(既存の最大値+1)。座席と同じ方式を会議室・家具へも使う。
// §02-3 の取り込み(utils/layout/team-import)もチームidをここで採番する — 採番規則を
// 写して持つと、片方だけ変えたときに同じidのチームが2つできる
export const nextSequentialId = (ids: string[], prefix: string, pad: number): string => {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`)
  let max = 0
  for (const id of ids) {
    const m = pattern.exec(id)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}${String(max + 1).padStart(pad, '0')}`
}

// 90°時計回りの次の角度。rotation は 0/90/180/270 の4値しか取らないので表引きにしない
const nextRotation = (rotation: Seat['rotation']): Seat['rotation'] =>
  rotation === 0 ? 90 : rotation === 90 ? 180 : rotation === 180 ? 270 : 0

type BoxPatch = { x?: number; y?: number; width?: number; height?: number }

// 位置・寸法に加えて §05-3 のロック/ラベル表示も同じ更新口を通す
type ObjectPatch = BoxPatch & { locked?: boolean; labelVisible?: boolean }

// 会議室・家具の共通更新。対象が居なければ元のレイアウトをそのまま返す(undo を積ませない)
const patchObject = (
  layout: SeatLayout,
  kind: EditableObjectKind,
  id: string,
  patch: ObjectPatch
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
    case 'seat-rotate': {
      const ids = new Set(action.seatIds)
      // 対象が1件も居なければ元のレイアウトを返す(dispatch が undo を積まない)
      if (!layout.seats.some((s) => ids.has(s.id))) return layout
      return {
        ...layout,
        seats: layout.seats.map((s) => (ids.has(s.id) ? { ...s, rotation: nextRotation(s.rotation) } : s)),
      }
    }
    case 'seat-reshape': {
      const ids = new Set(action.seatIds)
      // 形状ごとの既定サイズ・クランプ・回転時の w/h 交換は applySeatShape が持つ。
      // 手で広げた席(isSizeOverridden)はサイズを押し戻さない
      let changed = false
      const seats = layout.seats.map((s) => {
        if (!ids.has(s.id)) return s
        const next = applySeatShape(s, action.shape)
        if (next !== s) changed = true
        return next
      })
      // 形状もサイズも動かないなら無変化を返す(dispatch が undo を積まない)
      if (!changed) return layout
      return { ...layout, seats }
    }
    case 'seat-delete-many': {
      const ids = new Set(action.seatIds)
      if (!layout.seats.some((s) => ids.has(s.id))) return layout
      return { ...layout, seats: layout.seats.filter((s) => !ids.has(s.id)) }
    }
    case 'seat-assign': {
      const seat = layout.seats.find((s) => s.id === action.seatId)
      if (!seat) return layout
      // 付け替えても座席IDの接頭辞は移動元チームのまま(トーストの {seatId} に旧接頭辞が出る)。
      // 所属判定は teamId が正本なので表示以外に影響はなく、これは許容仕様
      return {
        ...layout,
        seats: layout.seats.map((s) => (s.id === action.seatId ? { ...s, teamId: action.teamId } : s)),
      }
    }
    case 'seat-replace-all': {
      if (!layout.teams.some((t) => t.id === action.teamId)) return layout
      // 未確定座席(isPending)は確定させずに捨てる。編集セッション中の仮置きを保存物へ残さない。
      // teamId は対象チームで揃える — 別チームの席が混ざると、下の others 側に残った
      // 旧席と二重になって「1つの席が2チームに見える」壊れ方をする
      const replaced = action.seats
        .filter((s) => !s.isPending)
        .map((s) => (s.teamId === action.teamId ? s : { ...s, teamId: action.teamId }))
      // 差し替え後も配列順を保つ(対象チームの席があった位置へ差し込む)。末尾へ足すと
      // sr-only ミラーの読み上げ順が操作のたびに入れ替わる
      const seats: Seat[] = []
      let inserted = false
      for (const s of layout.seats) {
        if (s.teamId !== action.teamId) {
          seats.push(s)
          continue
        }
        if (!inserted) {
          seats.push(...replaced)
          inserted = true
        }
      }
      if (!inserted) seats.push(...replaced)
      return { ...layout, seats }
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
      const relaid = relayoutSeatsInGrid(teamSeats, team.area, action.cols)
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
        color: action.color,
        area: { x: action.x, y: action.y, w: action.width, h: action.height },
      }
      // §02-2: 新規チームは 2行4列 = 8席を全て空席で連れてくる。座席の位置は
      // ゴーストの寸法と同じ team-create-grid から導く(枠と席の計算を二重に持たない)
      const addedSeats: Seat[] = []
      for (const box of newTeamSeatBoxes(added.area)) {
        addedSeats.push({
          // 採番規則は既存席と共通('{idPrefix}-{nnn}')。積み上げ中の席も母集団に入れる
          id: nextSeatId([...layout.seats, ...addedSeats], idPrefix),
          teamId: added.id,
          x: box.x,
          y: box.y,
          width: box.w,
          height: box.h,
          rotation: 0,
          employeeId: null,
        })
      }
      return { ...layout, teams: [...layout.teams, added], seats: [...layout.seats, ...addedSeats] }
    }
    case 'team-replace-all': {
      // 座席には触らない。チームを消した分の座席の後始末は team-delete の担当で、
      // ここで一緒にやると「置き換えたつもりが席まで消えた」経路が2つになる
      return { ...layout, teams: action.teams }
    }
    case 'team-import': {
      // 採番(idPrefix・チームid)・ラベル重複回避・座席の再接頭辞複製・配置座標は
      // utils/layout/team-import が決め終えている。ここは積むだけ
      if (action.teams.length === 0) return layout
      return {
        ...layout,
        teams: [...layout.teams, ...action.teams],
        seats: [...layout.seats, ...action.seats],
      }
    }
    case 'team-delete': {
      if (!layout.teams.some((t) => t.id === action.teamId)) return layout
      // 所属判定は seat.teamId が正本。座席IDの接頭辞では判定しない
      // (接頭辞は採番専用で、チーム跨ぎの付け替え後は旧チームのまま残る)
      return {
        ...layout,
        teams: layout.teams.filter((t) => t.id !== action.teamId),
        seats: layout.seats.filter((s) => s.teamId !== action.teamId),
      }
    }
    case 'facility-add': {
      // 施設ピッカー(§03-3)から来た分は Garoon の登録名と施設IDをそのまま載せる。
      // 素の追加(マスタ未経由)は予定システムと未連携のまま採番する — デモとして嘘をつかない
      const meetingCount = layout.facilities.filter((f) => f.kind === 'meeting').length
      const added: Facility = {
        id: nextSequentialId(layout.facilities.map((f) => f.id), 'fac-', 2),
        name: action.name ?? `会議室${meetingCount + 1}`,
        kind: 'meeting',
        x: action.x,
        y: action.y,
        width: action.width,
        height: action.height,
      }
      if (action.facilityId !== undefined) added.facilityId = action.facilityId
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
    case 'object-lock':
      return patchObject(layout, action.kind, action.id, { locked: action.locked })
    case 'object-label-visible':
      return patchObject(layout, action.kind, action.id, { labelVisible: action.labelVisible })
    case 'object-delete': {
      // 照合キーは Facility.id / Furniture.id。facilityId フィールドと紛らわしいので取り違えない
      if (action.kind === 'facility') {
        if (!layout.facilities.some((f) => f.id === action.id)) return layout
        return { ...layout, facilities: layout.facilities.filter((f) => f.id !== action.id) }
      }
      if (!layout.furniture.some((f) => f.id === action.id)) return layout
      return { ...layout, furniture: layout.furniture.filter((f) => f.id !== action.id) }
    }
  }
}
