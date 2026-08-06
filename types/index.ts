// 01-mock-data 定義元。以降の全ドキュメントはこの型のみを使用する

// 在席ステータス(表示ラベル: present=在席 / meeting=会議 / out=外出 / vacation=休暇)
export type PresenceStatus = 'present' | 'meeting' | 'out' | 'vacation'

// --- 実物 PiPiT-web 由来のテーマ型(ThemeSelector が data-theme を切り替える) ---

// テーマ種別の単一ソース型定義 — light(既定) / dracula / kuroxxx の3種
// 配色実体は styles/parts/theme.css の data-theme トークンで管理する
// 旧 'dark'(グレージュ) は廃止し dracula をメインダークへ昇格

export type ThemeMode = 'light' | 'dracula' | 'kuroxxx'

// メインのダークテーマ — OS ダーク追従・旧 'dark' 移行の落とし先
const DEFAULT_DARK_THEME: ThemeMode = 'dracula'

// localStorage 復元時の検証に使う全テーマ値
const THEME_MODES: readonly ThemeMode[] = ['light', 'dracula', 'kuroxxx']

// 暗い系テーマ判定 — Tailwind dark バリアント付与・暗色トーン適用の基準
export const isDarkTheme = (mode: ThemeMode): boolean => mode !== 'light'

// 旧 'dark' テーマの保存値を dracula へ移行する — 廃止テーマの後方互換
export const migrateLegacyTheme = (value: string | null): string | null =>
  value === 'dark' ? DEFAULT_DARK_THEME : value

// localStorage に保存された文字列が有効な ThemeMode か検証する型ガード
export const isThemeMode = (value: string | null): value is ThemeMode =>
  value !== null && (THEME_MODES as readonly string[]).includes(value)

// テーマ選択 UI 用メタ — ラベルと2色スウォッチ(背景 + アクセント)
export interface ThemeOption {
  mode: ThemeMode
  label: string
  swatchBg: string
  swatchAccent: string
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { mode: 'light', label: 'ライト', swatchBg: '#F5EFE9', swatchAccent: '#C76A4A' },
  { mode: 'dracula', label: 'ドラキュラ', swatchBg: '#282A36', swatchAccent: '#BD93F9' },
  { mode: 'kuroxxx', label: 'クロミ', swatchBg: '#1A1320', swatchAccent: '#F58FB8' },
]

// --- 実物 PiPiT-web 由来のピクセルアバター型 ---

// プリセット ID — 原文 types.ts の union は抜粋の先頭が欠けていたため
// pixelAvatarPresets.ts の PIXEL_AVATAR_PRESETS のキー18件から復元した
export type PixelAvatarPresetId =
  | 'av1'
  | 'av2'
  | 'av3'
  | 'av4'
  | 'av5'
  | 'av6'
  | 'av7'
  | 'av8'
  | 'av9'
  | 'av10'
  | 'av11'
  | 'av12'
  | 'av13'
  | 'av14'
  | 'av15'
  | 'av16'
  | 'av17'
  | 'av18'

// パーツ ID — 各バリアントを追加するときは type に 1 行 + マトリクスに 1 エントリ
export type HairId =
  | 'short'
  | 'long'
  | 'bald'
  | 'mohawk'
  | 'topknot'
  | 'windSweep'
  | 'garou'
  | 'curl'
  | 'neatBob'
  | 'softBob'
  | 'bob'
  | 'ponytail'
  | 'twintail'
  | 'wavy'
  | 'hime'
  | 'hood'
  | 'bobBangs'
  | 'wavyBangs'
  | 'longStraight'
  | 'cCurlBob'
  | 'kuroxxx'
export type FaceId = 'slit' | 'smile' | 'closed' | 'serious' | 'wink' | 'stern' | 'smirk' | 'happy'
export type AccessoryId =
  | 'none'
  | 'glasses'
  | 'cap'
  | 'mask'
  | 'sunglasses'
  | 'glassesThick'
  | 'glassesAviator'
  | 'glassesRound'
  | 'bow'
export type OutfitId =
  | 'solid'
  | 'striped'
  | 'suit'
  | 'hoodie'
  | 'shirt'
  | 'blazer'
  | 'knit'
  | 'cardigan'
  | 'polo'
  | 'turtleneck'
  | 'vest'

// パレット — hex 文字列。色はパーツ間で共有
export interface AvatarPalette {
  hair: string
  skin: string
  outfit: string
  outfitDark: string
  outfitAlt?: string
  accessory?: string
}

// preset config — id 1 つで parts に展開される (lib/pixelAvatarPresets が解決)
interface PresetAvatarConfig {
  kind: 'preset'
  id: PixelAvatarPresetId
}

// parts config — ユーザーが自由にカスタマイズできる完全合成型
export interface PartsAvatarConfig {
  kind: 'parts'
  hair: HairId
  face: FaceId
  accessory?: AccessoryId
  outfit: OutfitId
  palette: AvatarPalette
}

// pixels config — AI 自由生成の 16x16 フリーピクセルモード
// size 固定 16 / rows: 16本・各 16 文字 / palette: 文字キー→HEX('#RRGGBB')
export interface PixelsAvatarConfig {
  kind: 'pixels'
  size: 16
  palette: Record<string, string>
  rows: string[]
}

export type PixelAvatarConfig = PresetAvatarConfig | PartsAvatarConfig | PixelsAvatarConfig

// 8x8 ピクセルマトリクス — 各セルはパレットキー or null (透明)
export type PixelMatrix = (string | null)[][]

export interface StoredAvatarRecord {
  ownerCode: string
  ownerName: string
  config: PixelAvatarConfig
  updatedTime: string
}

// --- 実物由来ここまで ---

// 社員
export type Employee = {
  id: string
  name: string
  nameKana: string
  teamId: string
  // 部署名の文字列。実物のディレクトリツリーはこれでグルーピングする(座席結束は teamId)
  team: string
  // 4桁社員番号。アバターレコード(StoredAvatarRecord)の一意キー
  ownerCode?: string
  // 氏名フリガナ(半角カタカナ)。デモの表示名は「部署名+連番」の合成なので姓側のみ持つ
  furiganaSei?: string
  furiganaMei?: string
  // 外国籍社員フラグ(表示名を全カタカナ化し氏名レイアウトを左寄せにする)
  isForeign?: boolean
  position?: string
  email?: string
  // 携帯電話番号(ハイフン無し11文字。公開リポジトリのため下4桁は 'xxxx' の伏せ字。表示側で 3-4-4 に整形する)
  phone?: string
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

// LOD(詳細度)。detail=アバター+名前+状態 / mid=アバター+状態ドット / overview=最小表示。
// 以前は SeatCard・TeamArea・SeatMapCanvas/type の3箇所に同じ union が別々に書かれていた
export type Lod = 'detail' | 'mid' | 'overview'

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

// 家具。会議室(Facility)とは別型にする。Facility.kind へ家具種別を混ぜると
// 既存の会議室ロジック(状態色・ホバーカード・詳細パネル)が全て巻き添えになるため分ける
export type FurnitureKind =
  | 'wall'
  | 'column'
  | 'stairs'
  | 'door'
  | 'window'
  | 'sofa'
  | 'table'
  | 'shelf'
  | 'plant'
  | 'bed'

// name は建設設備(壁・柱・階段・ドア・窓)では空文字固定。ラベル・既定サイズ・
// グループ分けは utils/furniture-catalog.ts が持つ
export type Furniture = {
  id: string
  kind: FurnitureKind
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: 0 | 90 | 180 | 270
}

// 編集対象になりうるオブジェクトの種別。当たり判定・吸着・選択の対象を
// 1つの列挙で束ね、種別追加時の取りこぼしを型で塞ぐ(utils/layout-objects.ts)
export type LayoutObjectKind = 'seat' | 'team' | 'facility' | 'furniture'

export type LayoutObjectRef = { kind: LayoutObjectKind; id: string }

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

// フロアレイアウト(ローダーが teams+seats+facilities+furniture を合成)。
// furniture は必須にして、保存済みレイアウトの読み込み口(lib/layout-persistence.ts)で
// 既定 [] を埋める。任意にすると各利用側が undefined を意識する必要が出る
export type SeatLayout = {
  floorId: string
  floorName: string
  viewBox: { width: number; height: number }
  seats: Seat[]
  teams: Team[]
  facilities: Facility[]
  furniture: Furniture[]
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
