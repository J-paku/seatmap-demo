// 01-mock-data 定義元。以降の全ドキュメントはこの型のみを使用する

// 在席ステータス(表示ラベル: present=在席 / meeting=会議 / out=外出 / vacation=休暇)
export type PresenceStatus = 'present' | 'meeting' | 'out' | 'vacation'

// --- 実物 PiPiT-web 由来のテーマ型(ThemeSelector が data-theme を切り替える) ---

// テーマ種別の単一ソース型定義 — light(既定) / dracula / kuroxxx の3種
// 配色実体は styles/parts/theme.css の data-theme トークンで管理する
// 旧 'dark'(グレージュ) は廃止し dracula をメインダークへ昇格

export type ThemeMode = 'light' | 'dracula' | 'kuroxxx'

// テーマの既定値・検証・UI メタ(ランタイム値)は utils/theme.ts に集約する(types/ は型定義のみを持つ)

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
  position?: string
  email?: string
  // 携帯電話番号(ハイフン無し11文字。公開リポジトリのため下4桁は 'xxxx' の伏せ字。表示側で 3-4-4 に整形する)
  phone?: string
}

// チーム(部署)
export type Team = {
  id: string
  // 座席ID接頭辞。所属判定の正本は seat.teamId であり、idPrefix は
  // 座席IDの採番('{idPrefix}-{nnn}')と data-team-id フックの値にだけ使う。
  // 所属判定には使わない(seat.id.startsWith(idPrefix + '-') で所属を見ている
  // ランタイムコードは存在しない。両方を判定基準にすると片方だけ壊れる)
  idPrefix: string
  name: string
  color: string
  area: { x: number; y: number; w: number; h: number }
  // 移動・リサイズ・座席増減を全て禁止する
  locked?: boolean
  // 固定グリッド。指定があるチームは座席の並びをこの行×列に保つ
  fixedLayout?: { rows: number; cols: number }
  // フリーアドレス(席を個人へ固定しない運用)
  freeAddressEnabled?: boolean
  // 所属人数に合わせて座席を自動増減する
  autoFillEnabled?: boolean
  // チームラベルの表示位置(viewBox座標)。未指定なら area から算出する。
  // 既定値を埋めないのは「未指定 = area 追従」が意味のある状態のため
  labelX?: number
  labelY?: number
  // bg / stroke / labelColor / dotColor は持たない。配色は color 1つから
  // utils/team-colors.ts が派生させる(色の判定基準を2箇所に持たないため)
}

// LOD(詳細度)。detail=アバター+名前+状態 / mid=アバター+状態ドット / overview=最小表示。
// 以前は SeatCard・TeamArea・SeatMapCanvas/type の3箇所に同じ union が別々に書かれていた
export type Lod = 'detail' | 'mid' | 'overview'

// 座席
export type Seat = {
  id: string
  // 座席↔チーム所属判定の正本。Team.idPrefix では判定しない
  teamId: string
  x: number
  y: number
  width: number
  height: number
  rotation: 0 | 90 | 180 | 270
  employeeId: string | null
  // 座席形状。既定サイズは standard 105×75 / executive 110×90 / vertical 75×105
  shape?: 'standard' | 'executive' | 'vertical'
  // 編集セッション中に追加された未確定座席。保存時に自動で取り除く
  isPending?: boolean
  // 座席が生まれた経緯。'auto_fill_toggle' は自動席数調整が作った席
  origin?: 'manual' | 'auto_fill_toggle'
  // 利用者が shape の既定サイズから手で変えた。以降は shape 変更でサイズを上書きしない
  isSizeOverridden?: boolean
  // status / employee は増やさない。着席判定は utils/seat-occupancy.ts の employeeId 基準1本に
  // 保ち、同じ概念の2つ目の判定基準を作らないため(2つあると片方だけ壊れて気付けない)
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
  // 移動・リサイズ・削除を禁止する
  locked?: boolean
  // キャンバス上に名前ラベルを描くか
  labelVisible?: boolean
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
// 'facility' は足さない。会議室は Facility 型が持ち、混ぜると上記の巻き添えが起きる

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
  // 回転角。90/270 は中心基準で w/h を入れ替えて描く
  rotation?: 0 | 90 | 180 | 270
  // キャンバス上に名前ラベルを描くか(建設設備は name が空文字なので実質無効)
  labelVisible?: boolean
  // 移動・リサイズ・削除を禁止する
  locked?: boolean
}

// 編集対象になりうるオブジェクトの種別。当たり判定・吸着・選択の対象を
// 1つの列挙で束ね、種別追加時の取りこぼしを型で塞ぐ(utils/layout/layout-objects.ts)
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

// フロア(階)1件。一覧表示や切り替えUIはこの形だけを見る
export type Floor = { floorId: string; floorName: string }

// フロア識別子。値(FLOORS一覧・DEFAULT_FLOOR_ID・isFloorId・floorNameOf)は
// utils/floors.ts に集約する(types/ は型定義のみを持つ)。型だけここで再エクスポートする
export type { FloorId } from '@/utils/floors'

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
  // 保存フォーマットの版。書き込みは lib/layout-persistence.ts が行う
  schemaVersion?: number
  // 最終保存時刻(ISO文字列)。楽観ロック(「他の管理者が更新しました」)の照合キー
  updatedTime?: string
}

// 保存済みレイアウト(localStorage から読んだもの)。schemaVersion と updatedTime が
// 必ず入っている点だけが SeatLayout と違う。埋めるのは lib/layout-persistence.ts の
// 読み込み口1箇所だけ。
//
// SeatLayout 側で必須にしない理由: 種データ合成分(hooks/use-mock-data.ts)と
// 空レイアウトの雛形(utils/layout/layout-id.ts)は一度も保存されておらず、
// 保存時刻を持ちようがない。必須にすると「保存していないのに保存時刻がある」嘘の値を
// 各所で作ることになり、楽観ロックの照合が意味を失う
export type StoredSeatLayout = SeatLayout & { schemaVersion: number; updatedTime: string }

// チームバウンダリのクリックで渡ってくる情報。rect が拡大の原点になる
export type TeamOverlayPayload = {
  teamId: string
  teamName: string
  teamColor: string
  rect: DOMRect
}

// ミニマップ上の描き分け区分。データ側の Facility.kind をそのまま渡さない。
// 会議室は meeting/booth/common の3種あるがミニマップでは同じ「名前つきの箱」なので
// ここで区分へ畳んでおき、ミニマップ側が元データの種別を知らずに済むようにする
export type MinimapKind = 'facility' | 'aisle' | 'structure' | 'object'

// チーム領域1件(座標は viewBox 系)。dotColor は解決済みのチーム色を受け取り、
// ミニマップ側で色を再解決しない(同じ概念の判定基準を二重に持たないため)
export type MinimapArea = {
  idPrefix: string
  x: number
  y: number
  w: number
  h: number
  label: string
  dotColor: string
}

// 会議室・通路・家具1件(座標は viewBox 系)
export type MinimapFurniture = {
  id: string
  kind: MinimapKind
  name: string
  x: number
  y: number
  width: number
  height: number
}

// STEP1: 複数レイアウト対応 — カスタムレイアウトのメタ一覧(lib/layout-persistence.ts の
// seatmap-demo/layouts に配列で保存)。実物の ownerCode は持たない
// (デモに認証が無く常に単独利用のため)
export type LayoutMeta = {
  layoutId: string
  layoutName: string
  updatedAt: string
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
  // 押さえた会議室の施設ID(Facility.facilityId と同じ空間)。施設を押さえない予定
  // (外出・休暇・オンライン会議)は持たない。同じ会議に出る全員の予定へ同じ値が入る
  facilityId?: string
  // 非公開予定。本人以外には件名を出さず時間帯だけ見せる。区分は残るので在席状態は変わらない
  isPrivate?: boolean
  // 会議の登録者の社員ID。category が 'meeting' の予定のみ持つ
  organizerId?: string
  // 会議の参加者全員(登録者を含む)の社員ID配列。category が 'meeting' の予定のみ持つ
  participantIds?: string[]
}
