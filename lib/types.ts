// 01-mock-data 定義元。以降の全ドキュメントはこの型のみを使用する

// 在席ステータス(表示ラベル: present=在席 / meeting=会議 / out=外出 / vacation=休暇)
export type PresenceStatus = 'present' | 'meeting' | 'out' | 'vacation'

// ピクセルアバター設定
export type AvatarConfig = {
  hair: 'short' | 'long' | 'bob' | 'ponytail' | 'bald'
  face: 'smile' | 'closed' | 'serious' | 'wink'
  outfit: 'suit' | 'shirt' | 'hoodie' | 'knit'
  palette: { hair: string; skin: string; outfit: string }
}

// 社員
export type Employee = {
  id: string
  name: string
  nameKana: string
  teamId: string
  position?: string
  email?: string
  avatar: AvatarConfig
}

// チーム(部署)
export type Team = {
  id: string
  name: string
  color: string
  area: { x: number; y: number; w: number; h: number }
}

// 座席
export type Seat = {
  id: string
  teamId: string
  x: number
  y: number
  width: number
  height: number
  rotation: 0 | 90 | 180 | 270
  employeeId: string | null
}

// 施設
export type Facility = {
  id: string
  name: string
  kind: 'meeting' | 'booth' | 'common'
  capacity?: number
  x: number
  y: number
  width: number
  height: number
}

// フロアレイアウト(ローダーが teams+seats+facilities を合成)
export type SeatLayout = {
  floorId: string
  floorName: string
  viewBox: { width: number; height: number }
  seats: Seat[]
  teams: Team[]
  facilities: Facility[]
}

// 予定イベント
export type ScheduleEvent = {
  id: string
  employeeId: string
  title: string
  category: 'meeting' | 'out' | 'vacation'
  start: string
  end: string
  isAllDay: boolean
}

// 在席ステータス表示ラベル
export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  present: '在席',
  meeting: '会議',
  out: '外出',
  vacation: '休暇',
}
