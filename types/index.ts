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
  // 携帯電話番号(数字のみ・ハイフン無し。tel:リンクはそのまま使い、表示側で整形する)
  phone?: string
  avatar: AvatarConfig
}

// チーム(部署)
export type Team = {
  id: string
  // 11: 座席ID接頭辞。seat.id.startsWith(idPrefix + '-') が座席↔チーム結束の唯一のキー
  idPrefix: string
  name: string
  // 部署名の読み(全角カタカナ)。かな検索で部署名グループを引っ掛けるための検索用フィールド
  kana: string
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
  // 11: aisle は通路(会議室として扱わない・facilityId を持たない)
  kind: 'meeting' | 'booth' | 'common' | 'aisle'
  capacity?: number
  x: number
  y: number
  width: number
  height: number
  // 11: 予定システムの施設ID。無ければ 施設未連携(会議が付かない)
  facilityId?: string
}

// 10/11: 会議室の予約状態(available=空室 / in_meeting=会議中 / upcoming=まもなく / unlinked=施設未連携)
export type FacilityStatus = 'available' | 'in_meeting' | 'upcoming' | 'unlinked'

// 会議室に紐づく会議。時刻(分)のみ持ち日付非依存で、いつ見てもデモが活性になる
export type FacilityMeeting = {
  id: string
  facilityId: string
  title: string
  startMin: number
  endMin: number
  organizerId: string
  participantIds: string[]
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
