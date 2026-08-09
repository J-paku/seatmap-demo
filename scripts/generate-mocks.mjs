// mocks/ の JSON(employees/avatars/teams/seats/schedules/facilities/facility-meetings)を決定論的に再生成する
// 実行: node scripts/generate-mocks.mjs
// 乱数は社員ID/チームidPrefix ハッシュ由来の seeded PRNG のみ。日付は BASE_DATE 固定で再現性を担保する
// フロアぶんは mocks/<フロアのディレクトリ>/ へ書き出す(既定フロアだけ mocks/ 直下)

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fitsCapacity, isOverlapping, meetingKey } from './lib/meeting-rules.mjs'
import { SELF_EMPLOYEE_ID } from './lib/demo-identity.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MOCKS_DIR = join(__dirname, '..', 'mocks')

// 当日分の基準日。出力を決定論的に保つため固定値を使う。
// 実際の表示日は utils/schedule-anchor が読み込み時に「今日」へ寄せるので、
// ここの値が古くてもデモが空になることはない
const BASE_DATE = '2026-07-27'

// ── プール定義 ──────────────────────────────────────────

// フロア定義(並び順は types/index.ts の FLOORS と同じ)。
// dir: 書き出し先。既定フロア(先頭)だけ mocks/ 直下で、それ以外は mocks/<dir>/ 配下
const FLOOR_DEFS = [
  { floorId: 'floor-1', dir: '.' },
  { floorId: 'floor-2', dir: 'floor-2' },
]
const DEFAULT_FLOOR_ID = FLOOR_DEFS[0].floorId

// チーム定義(名称順が定義順 team-01..06)
// idPrefix: 座席ID接頭辞(11-layout-pipeline.md — seat.id.startsWith(idPrefix + '-') が唯一の結束キー)
// kana: 部署名の読み(全角カタカナ)。かな検索用。社員 nameKana(=kana+連番)の元にもなる
// size: 箱幅算出専用の想定列数(座席2行化に合わせて箱高だけ変更・幅はここを据え置いて7/7/6/6/5列を維持)
// empCount: 実際の社員数(再席率70%前後に合わせて size とは独立に増員)
// floorId: 所属フロア。color/area を明示したチームは帯レイアウトの自動算出に載せない
const TEAM_DEFS = [
  { name: '営業部', kana: 'エイギョウブ', mail: 'ei', size: 8, empCount: 10, idPrefix: 'dept-sales', floorId: 'floor-1' },
  { name: '開発部', kana: 'カイハツブ', mail: 'ka', size: 8, empCount: 10, idPrefix: 'dept-dev', floorId: 'floor-1' },
  { name: '総務部', kana: 'ソウムブ', mail: 'so', size: 7, empCount: 9, idPrefix: 'dept-general', floorId: 'floor-1' },
  { name: '経理部', kana: 'ケイリブ', mail: 'ke', size: 7, empCount: 8, idPrefix: 'dept-account', floorId: 'floor-1' },
  { name: '企画部', kana: 'キカクブ', mail: 'ki', size: 6, empCount: 7, idPrefix: 'dept-planning', floorId: 'floor-1' },
  // 2F の小部屋。色相環(72°刻み)を5チームで使い切っており自動採番だと営業部と同じ色相になるため、
  // 色と箱位置は既存 mocks/floor-2/teams.json の値をそのまま定義として持つ
  {
    name: '総務部分室',
    kana: 'ソウムブブンシツ',
    mail: 'so',
    size: 2,
    empCount: 4,
    idPrefix: 'dept-somu-annex',
    floorId: 'floor-2',
    color: '#C6A653',
    area: { x: 30, y: 30, w: 280, h: 220 },
  },
]

// 携帯電話番号プレフィックス(070/080/090)
const MOBILE_PREFIXES = ['090', '080', '070']

const HAIRS = ['short', 'long', 'bob', 'ponytail', 'bald']
const FACES = ['smile', 'closed', 'serious', 'wink']
const OUTFITS = ['suit', 'shirt', 'hoodie', 'knit']
// 原本実測: 基本アバターの髪#2A1A0F/肌#F0C49A/上衣#3B6EA8 を先頭に(多様性は維持)
const HAIR_COLORS = ['#2A1A0F', '#3B2B20', '#241C16', '#4A3728', '#1F1A17']
const SKIN_COLORS = ['#F0C49A', '#F6D7B8', '#E8B48C', '#FAE0C8']
const OUTFIT_COLORS = ['#3B6EA8', '#2F3B52', '#4A5A6E', '#7C9E6F', '#8A5A5A', '#5C5470']

// ── ユーティリティ ──────────────────────────────────────

// 文字列 → 32bit ハッシュ(PRNG シード用)
const hashString = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// mulberry32: シードから [0,1) を返す決定論的 PRNG
const mulberry32 = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// HSL → HEX(S/L は 0..1)
const hslToHex = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0').toUpperCase()
  return `#${to(r)}${to(g)}${to(b)}`
}

// 全角カタカナ→半角カタカナ。濁点・半濁点は2文字へ分解する(社員名簿の furigana 表記に合わせる)
const KANA_FULL =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンァィゥェォッャュョー'
const KANA_HALF =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｧｨｩｪｫｯｬｭｮｰ'
const KANA_VOICED = 'ガギグゲゴザジズゼゾダヂヅデドバビブベボ'
const KANA_VOICED_BASE = 'カキクケコサシスセソタチツテトハヒフヘホ'
const KANA_SEMI = 'パピプペポ'
const KANA_SEMI_BASE = 'ハヒフヘホ'
const toHalfWidthKana = (value) =>
  [...value]
    .map((ch) => {
      const v = KANA_VOICED.indexOf(ch)
      if (v >= 0) return `${KANA_HALF[KANA_FULL.indexOf(KANA_VOICED_BASE[v])]}ﾞ`
      const s = KANA_SEMI.indexOf(ch)
      if (s >= 0) return `${KANA_HALF[KANA_FULL.indexOf(KANA_SEMI_BASE[s])]}ﾟ`
      const i = KANA_FULL.indexOf(ch)
      return i >= 0 ? KANA_HALF[i] : ch
    })
    .join('')

// 服の単色から三色を生成。式は utils/avatar/avatar-color-utils.ts の deriveOutfitColors と同じに保つ
// (このスクリプトは .mjs なので TS を import できず、やむを得ず複製している)
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const rgbToHex = (rgb) =>
  `#${rgb.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')}`
const deriveOutfitColors = (base) => {
  const [r, g, b] = hexToRgb(base)
  return {
    outfit: base,
    outfitDark: rgbToHex([r * 0.74, g * 0.74, b * 0.74]),
    outfitAlt: rgbToHex([r + (255 - r) * 0.32, g + (255 - g) * 0.32, b + (255 - b) * 0.32]),
  }
}

const pad3 = (n) => String(n).padStart(3, '0')
const pad2 = (n) => String(n).padStart(2, '0')
const pad4 = (n) => String(n).padStart(4, '0')

// 社員IDから携帯電話番号を決定論的に生成(数字のみで保持し、tel:リンク・表示整形の両方を単一値で賄う)
// 約20%判定(実結果は15〜20%レンジに収まる)は電話番号なしとし、詳細パネルの未設定表示分岐を実データで踏ませる
// 公開リポジトリなので下4桁は伏せ字にし、実在番号と衝突しうる完全な11桁を残さない。
// 表示整形(3-4-4)は文字数だけを見るので伏せ字のままで通る
const buildPhone = (empId) => {
  const rand = mulberry32(hashString(`phone-${empId}`))
  if (rand() < 0.2) return undefined
  const prefix = MOBILE_PREFIXES[Math.floor(rand() * MOBILE_PREFIXES.length)]
  let middle = ''
  for (let i = 0; i < 4; i++) middle += Math.floor(rand() * 10)
  return `${prefix}${middle}xxxx`
}

// ── チーム生成 ──────────────────────────────────────────

// 座席サイズ・列ピッチ(幅105+間隔18)
const SEAT_W = 105
const SEAT_H = 75
const PITCH_X = SEAT_W + 18 // 123(11-layout-pipeline.md の列ピッチ)

// 箱幅算出専用(座席の内側余白ではない・幅は size を据え置いて7/7/6/6/5列を維持する)
const BOX_PAD_X = 12

// 座席配置は 11-layout-pipeline.md の固定値に従う(LAYOUT_PADDING=20 / 行ピッチ95)
const LAYOUT_PADDING = 20 // 箱内壁の余白(上下左右とも20)
const LAYOUT_ROW_GAP = 20
const PITCH_Y = SEAT_H + LAYOUT_ROW_GAP // 95(スペック行ピッチ)

// 箱の高さ = 2行分の座席を20px内壁余白で収める最小値(20+95+75+20=210)+ 余裕10
const AREA_H_MIN = LAYOUT_PADDING * 2 + PITCH_Y + SEAT_H
const AREA_H_SLACK = 10
const AREA_H = AREA_H_MIN + AREA_H_SLACK // 220
const BAND_TOP = 6
const BAND_GAP = 2 // 帯同士の隙間(旧レイアウトと同じ2pxを踏襲)
const BAND_PITCH = AREA_H + BAND_GAP // 帯ピッチ(AREA_H より大きく重なりなし)

const teams = []
const seats = []
// 書き出しはフロアごとなので、生成しながらフロア別にも溜める(全フロア通しの配列は後段の割当が使う)
const teamsByFloor = new Map(FLOOR_DEFS.map((f) => [f.floorId, []]))
const seatsByFloor = new Map(FLOOR_DEFS.map((f) => [f.floorId, []]))
const seatCountReport = [] // 検証・報告用: 座席数が変化したチームを記録
const seatGeometryReport = [] // 検証・報告用: チームごとの列数×行数×収容数

// 帯レイアウトはフロアごとに上から積む(area 明示のチームは帯を消費しない)
const bandIndexByFloor = new Map(FLOOR_DEFS.map((f) => [f.floorId, 0]))

TEAM_DEFS.forEach((def, i) => {
  const teamId = `team-${pad2(i + 1)}`
  const idPrefix = def.idPrefix
  // HSL 色相環を5等分(隣接衝突回避のオフセット12°付与)。明示色を持つチームはそれを使う
  const color = def.color ?? hslToHex((i * 72 + 12) % 360, 0.5, 0.55)
  const cols = def.size // 箱幅算出用の想定列数(メンバー数)
  const band = bandIndexByFloor.get(def.floorId)
  const area = def.area ?? {
    x: 30,
    y: BAND_TOP + band * BAND_PITCH,
    w: cols * PITCH_X - 18 + BOX_PAD_X * 2,
    h: AREA_H,
  }
  if (!def.area) bandIndexByFloor.set(def.floorId, band + 1)
  const team = { id: teamId, idPrefix, name: def.name, color, area }
  teams.push(team)
  teamsByFloor.get(def.floorId).push(team)

  // 余白20・列ピッチ123・行ピッチ95で実際に入る列数/行数を capacity 式から算出
  const colsMax = Math.floor((area.w - 2 * LAYOUT_PADDING + 18) / PITCH_X)
  const rowsMax = Math.floor((area.h - 2 * LAYOUT_PADDING + LAYOUT_ROW_GAP) / PITCH_Y)
  const actualCols = Math.min(cols, Math.max(colsMax, 0))
  const actualRows = Math.min(2, Math.max(rowsMax, 0)) // 元設計は前列(着席)+後列(空席)の2行

  const before = cols * 2
  const after = actualCols * actualRows
  if (after !== before) seatCountReport.push({ team: def.name, before, after })

  // row0(前列)・row1(後列)とも座席を生成する。着席/空席の割当は後段でチームごとに分散させる
  let seatSeq = 1 // 座席ID連番はチームごとに再スタート
  for (let row = 0; row < actualRows; row++) {
    for (let col = 0; col < actualCols; col++) {
      const seat = {
        id: `${idPrefix}-${pad3(seatSeq++)}`,
        teamId,
        x: area.x + LAYOUT_PADDING + col * PITCH_X,
        y: area.y + LAYOUT_PADDING + row * PITCH_Y,
        width: SEAT_W,
        height: SEAT_H,
        rotation: 0,
        // 着席は後の社員割当で埋める。ひとまず null
        employeeId: null,
      }
      seats.push(seat)
      seatsByFloor.get(def.floorId).push(seat)
    }
  }

  seatGeometryReport.push({ team: def.name, cols: actualCols, rows: actualRows, capacity: actualCols * actualRows })
})

// 社員IDからフロアを引く索引(会議室の割当・会議室会議の参加者抽選が使う)
const floorIdByTeamId = new Map(TEAM_DEFS.map((def, i) => [`team-${pad2(i + 1)}`, def.floorId]))

// ── 社員生成 ────────────────────────────────────────────

const employees = []
// avatars.json(StoredAvatarRecord[])。社員レコードとは別立てにし、アバターの単一ソースにする
const avatarRecords = []
// モックは決定論的に再生成するので更新時刻も固定値にする(差分ノイズ防止)
const AVATAR_UPDATED_TIME = '2026-01-01T00:00:00.000Z'
let empSeq = 1
// チームごとにメンバーを順次割当。チーム内 local index 0=部長 / 3=課長
TEAM_DEFS.forEach((def, ti) => {
  const teamId = `team-${pad2(ti + 1)}`
  for (let local = 0; local < def.empCount; local++) {
    const gi = empSeq - 1 // 通し index
    const id = `emp-${pad3(empSeq)}`
    const position = local === 0 ? '部長' : local === 3 ? '課長' : undefined
    const phone = buildPhone(id)
    // 表示名は実名ではなく「部署名+連番」(例: 営業部1)。nameKana は「部署名の読み+同じ連番」(例: エイギョウブ1)
    const displayName = `${def.name}${local + 1}`
    const nameKana = `${def.kana}${local + 1}`
    const emp = {
      id,
      name: displayName,
      nameKana,
      teamId,
      // 実物ツリーは部署名の文字列でグルーピングするため、teamId とは別に部署名も持たせる
      team: def.name,
      // 4桁社員番号。アバターレコード(avatars.json)の一意キー
      ownerCode: pad4(empSeq),
      // 表示名が「部署名+連番」の合成なので姓/名に割れない。読み全体を姓側に入れる(半角カタカナ)
      furiganaSei: toHalfWidthKana(nameKana),
      ...(position ? { position } : {}),
      // 部署ローマ字2文字+4桁社員番号。ownerCode と同じ番号なので突合できる
      email: `${def.mail}${pad4(empSeq)}@example.co.jp`,
      ...(phone ? { phone } : {}),
    }
    employees.push(emp)
    // 3人に1人はアバター未設定にして、既定プリセットへのフォールバックも画面で確認できるようにする
    if (gi % 3 !== 0) {
      avatarRecords.push({
        ownerCode: emp.ownerCode,
        ownerName: displayName,
        config: {
          kind: 'parts',
          hair: HAIRS[gi % HAIRS.length],
          face: FACES[gi % FACES.length],
          outfit: OUTFITS[gi % OUTFITS.length],
          palette: {
            hair: HAIR_COLORS[gi % HAIR_COLORS.length],
            skin: SKIN_COLORS[gi % SKIN_COLORS.length],
            ...deriveOutfitColors(OUTFIT_COLORS[gi % OUTFIT_COLORS.length]),
          },
        },
        updatedTime: AVATAR_UPDATED_TIME,
      })
    }
    empSeq++
  }
})

const floorIdByEmployeeId = new Map(employees.map((e) => [e.id, floorIdByTeamId.get(e.teamId)]))

// 座席へ社員を割当。前列だけを埋めると空席が後列に固まるため、
// チーム固有シード(idPrefix ハッシュ)でチーム内の座席順をシャッフルしてから詰め、空席を両行に分散させる
{
  const empByTeam = {}
  employees.forEach((e) => {
    ;(empByTeam[e.teamId] ||= []).push(e.id)
  })
  const seatsByTeam = {}
  seats.forEach((s) => {
    ;(seatsByTeam[s.teamId] ||= []).push(s)
  })
  teams.forEach((team) => {
    const teamSeats = seatsByTeam[team.id] || []
    const pool = empByTeam[team.id] || []
    const rand = mulberry32(hashString(team.idPrefix))
    const order = teamSeats.map((_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    pool.forEach((empId, idx) => {
      teamSeats[order[idx]].employeeId = empId
    })
  })
}

// ── 施設生成 ────────────────────────────────────────────

// チームゾーンの実測境界(箱が縦に伸びたぶん、これを起点に通路・施設列を組み立てる)。
// 施設列は既定フロアの箱の右に組むので、境界も既定フロアのチームだけから採る
const defaultFloorTeams = teamsByFloor.get(DEFAULT_FLOOR_ID)
const teamZoneRight = Math.max(...defaultFloorTeams.map((t) => t.area.x + t.area.w))
const teamZoneTop = Math.min(...defaultFloorTeams.map((t) => t.area.y))
const teamZoneBottom = Math.max(...defaultFloorTeams.map((t) => t.area.y + t.area.h))

// viewBox: 幅は1600固定、高さは最下端オブジェクト(=teamZoneBottom)+余白から算出(ハードコードしない)
const VIEWBOX_W = 1600
const VIEWBOX_MARGIN_BOTTOM = 40
const VIEWBOX_H = teamZoneBottom + VIEWBOX_MARGIN_BOTTOM

const AISLE_WIDTH = 60
const FACILITY_MARGIN_TOP = 15
const FACILITY_MARGIN_BOTTOM = 15
const FACILITY_COL_GAP = 30 // 会議室サブ列とブース/共用サブ列の間隔
const MEETING_ROOM_WIDTH = 250

const facilityColAX = teamZoneRight + AISLE_WIDTH
const facilityColBX = facilityColAX + MEETING_ROOM_WIDTH + FACILITY_COL_GAP

// 縦方向に等間隔で敷き詰める(先頭上端を top、末尾下端を bottom に一致させ、上だけに固まらないようにする)
const distributeVertical = (items, top, bottom) => {
  const totalH = items.reduce((sum, it) => sum + it.height, 0)
  const gap = items.length > 1 ? (bottom - top - totalH) / (items.length - 1) : 0
  let y = top
  return items.map((it) => {
    const placed = { ...it, y: Math.round(y) }
    y += it.height + gap
    return placed
  })
}

const facilityRangeTop = FACILITY_MARGIN_TOP
const facilityRangeBottom = teamZoneBottom - FACILITY_MARGIN_BOTTOM

const meetingRooms = distributeVertical(
  [
    { id: 'fac-01', name: '会議室A', kind: 'meeting', capacity: 4, width: MEETING_ROOM_WIDTH, height: 130 },
    { id: 'fac-02', name: '会議室B', kind: 'meeting', capacity: 6, width: MEETING_ROOM_WIDTH, height: 150 },
    { id: 'fac-03', name: '会議室C', kind: 'meeting', capacity: 8, width: MEETING_ROOM_WIDTH, height: 175 },
    { id: 'fac-04', name: '会議室D', kind: 'meeting', capacity: 12, width: MEETING_ROOM_WIDTH, height: 210 },
    { id: 'fac-05', name: '応接室', kind: 'meeting', capacity: 6, width: MEETING_ROOM_WIDTH, height: 120 },
  ].map((f) => ({ ...f, x: facilityColAX })),
  facilityRangeTop,
  facilityRangeBottom
)

const boothsAndCommon = distributeVertical(
  [
    { id: 'fac-06', name: '電話ブース1', kind: 'booth', width: 120, height: 110 },
    { id: 'fac-07', name: '電話ブース2', kind: 'booth', width: 120, height: 110 },
    { id: 'fac-08', name: 'リフレッシュスペース', kind: 'common', width: 240, height: 220 },
  ].map((f) => ({ ...f, x: facilityColBX })),
  facilityRangeTop,
  facilityRangeBottom
)

const facilities = [...meetingRooms, ...boothsAndCommon]

// 通路: チームゾーン右端〜施設ゾーン左端の60px隙間を縦通路として埋める(kind: 'aisle', facilityId なし)
facilities.push({
  id: 'aisle-01',
  name: '通路',
  kind: 'aisle',
  capacity: 0,
  x: teamZoneRight,
  y: teamZoneTop,
  width: AISLE_WIDTH,
  height: teamZoneBottom - teamZoneTop,
})

// フロア2の施設。既定フロアのような帯レイアウト算出ではなく、実測値をそのまま定義として持つ
// (チーム箱1つの小フロアなので、通路と会議室2室だけの手置き)
const facilitiesFloor2 = [
  { id: 'fac2-01', name: '会議室E', kind: 'meeting', capacity: 4, width: 250, height: 130, x: 450, y: 30 },
  { id: 'fac2-02', name: '会議室F', kind: 'meeting', capacity: 6, width: 250, height: 150, x: 450, y: 200 },
  { id: 'aisle2-01', name: '通路', kind: 'aisle', capacity: 0, x: 350, y: 6, width: 60, height: 350 },
]

const facilitiesByFloor = new Map([
  [DEFAULT_FLOOR_ID, facilities],
  ['floor-2', facilitiesFloor2],
])
const allFacilities = FLOOR_DEFS.flatMap((f) => facilitiesByFloor.get(f.floorId))

// viewBox からはみ出す施設が無いかを検査(はみ出す場合は黙って切り詰めず報告する)。
// viewBox は全フロア共通(utils/layout/geometry.ts)なので、判定も全フロアぶん通す
const facilityOverflow = allFacilities.filter((f) => f.x < 0 || f.y < 0 || f.x + f.width > VIEWBOX_W || f.y + f.height > VIEWBOX_H)
if (facilityOverflow.length > 0) {
  console.error(`viewBox(${VIEWBOX_W}x${VIEWBOX_H})に収まらない施設: ${facilityOverflow.map((f) => f.id).join(',')}`)
}

// ── 予定生成 ────────────────────────────────────────────

const OUT_TITLES = ['客先訪問', '外出打ち合わせ', '現地調査', '銀行手続き']
const MEETING_TITLES = ['定例ミーティング', 'プロジェクト会議', '週次レビュー', '部門会議', '打ち合わせ']
const VACATION_TITLES = ['有給休暇', '休暇']

// ISO8601(+09:00)文字列を生成
const iso = (hour, minute) =>
  `${BASE_DATE}T${pad2(hour)}:${pad2(minute)}:00+09:00`

const schedules = []
let evSeq = 1
employees.forEach((emp) => {
  const rand = mulberry32(hashString(emp.id))
  // デモの「自分」だけは抽選せず時刻付き1件に固定する。非公開予定は後段で必ず1件立てるが、
  // 休暇(終日1件で他と排他)を引くと時刻付きの器が無くなり、立てる先が無くなるため
  const isSelf = emp.id === SELF_EMPLOYEE_ID
  const drawn = Math.floor(rand() * 4) // 0..3
  const count = isSelf ? 1 : drawn
  if (count === 0) return

  // 休暇(20%)判定: 発生したら終日1件のみ・他と排他
  const isVacation = !isSelf && rand() < 0.2
  if (isVacation) {
    schedules.push({
      id: `ev-${pad4(evSeq++)}`,
      employeeId: emp.id,
      title: VACATION_TITLES[Math.floor(rand() * VACATION_TITLES.length)],
      category: 'vacation',
      start: iso(0, 0),
      end: iso(23, 59),
      isAllDay: true,
    })
    return
  }

  // 9..18時の正時スロットから重複なく count 件
  const usedHours = new Set()
  let made = 0
  let guard = 0
  while (made < count && guard < 40) {
    guard++
    const hour = 9 + Math.floor(rand() * 9) // 9..17 開始(1時間枠)
    if (usedHours.has(hour)) continue
    usedHours.add(hour)
    // 会議50% / 外出30%(休暇は上で排他済み → 残りを 5:3 で分配)
    const isMeeting = rand() < 0.625
    const category = isMeeting ? 'meeting' : 'out'
    const titles = isMeeting ? MEETING_TITLES : OUT_TITLES
    schedules.push({
      id: `ev-${pad4(evSeq++)}`,
      employeeId: emp.id,
      title: titles[Math.floor(rand() * titles.length)],
      category,
      start: iso(hour, 0),
      end: iso(hour + 1, 0),
      isAllDay: false,
    })
    made++
  }
})

// ── 会議室の予定システム連携 + 会議データ ───────────────────
// 予定システム側の施設ID(facilityId)は全フロア通しで採番する。フロアごとに別系統で振ると
// 別フロアの室が同じIDを持ちうる(旧: 1F は fac-NN の下2桁流用、2F は手書き)。
// 未連携デモの応接室にも番号を消費させ、連携の有無を切り替えても他室の番号が動かないようにする
const UNLINKED_FACILITY_IDS = new Set(['fac-05']) // 応接室: 施設未連携デモとして意図的に連携しない
let facilitySeq = 0
allFacilities.forEach((f) => {
  if (f.kind !== 'meeting') return
  facilitySeq += 1
  if (UNLINKED_FACILITY_IDS.has(f.id)) return
  f.facilityId = `F-${pad2(facilitySeq)}`
})

// 終日の外出(出張)。休暇と違って時刻付きの予定と同居するので、予定表の「終日」帯と
// 時刻付き一覧が両方出る日を作る。休暇持ちの社員には付けない(休暇は終日1件で排他のため)
const employeesWithTimedEvents = [...new Set(schedules.filter((s) => !s.isAllDay).map((s) => s.employeeId))]
employeesWithTimedEvents.forEach((employeeId) => {
  if (mulberry32(hashString(`trip#${employeeId}`))() >= 0.4) return
  schedules.push({
    id: `ev-${pad4(evSeq++)}`,
    employeeId,
    title: '出張',
    category: 'out',
    start: iso(0, 0),
    end: iso(23, 59),
    isAllDay: true,
  })
})

// ── 予定への会議室割り当て + 非公開設定 ─────────────────────
// 同じ時刻・同じ件名の予定は「1つの会議が参加者それぞれの予定表に出ている」状態なので、
// グループごとに1室だけ押さえる。会議室は同時刻に二重予約できない(定員も超えられない)ため、
// 空いている室を先着順に割り当て、空きが無ければ施設なし(オンライン開催扱い)のままにする
const linkedByFloor = new Map(
  FLOOR_DEFS.map((f) => [f.floorId, facilitiesByFloor.get(f.floorId).filter((x) => x.facilityId)])
)
const bookingsByFacility = new Map(
  FLOOR_DEFS.flatMap((f) => linkedByFloor.get(f.floorId)).map((f) => [f.facilityId, []])
)

const meetingGroups = new Map()
schedules
  .filter((s) => s.category === 'meeting')
  .forEach((s) => {
    const key = meetingKey(s)
    const group = meetingGroups.get(key)
    if (group) group.push(s)
    else meetingGroups.set(key, [s])
  })

meetingGroups.forEach((group, key) => {
  // 非公開予定(件名を本人以外に出さない)。会議は予定単位ではなく会議単位で設定されるので
  // グループ全員に同じ値を入れる。在席状態は区分から出すので非公開でも変わらない
  if (mulberry32(hashString(`private#${key}`))() < 0.25) {
    group.forEach((s) => {
      s.isPrivate = true
    })
  }

  const start = Date.parse(group[0].start)
  const end = Date.parse(group[0].end)
  // 押さえる室は先頭参加者のフロアから選ぶ(フロアを跨ぐ会議はデモの範囲外)
  const rooms = linkedByFloor.get(floorIdByEmployeeId.get(group[0].employeeId)) ?? []
  if (rooms.length === 0) return
  // 探索の起点を会議ごとにずらす。先頭固定だと1室に偏り、他の室が一度も埋まらない
  const offset = hashString(`room#${key}`) % rooms.length
  const room = rooms
    .map((_, i) => rooms[(offset + i) % rooms.length])
    .find(
      (f) =>
        fitsCapacity(f, group.length) &&
        !bookingsByFacility.get(f.facilityId).some((b) => isOverlapping(start, end, b.start, b.end))
    )
  if (!room) return
  bookingsByFacility.get(room.facilityId).push({ start, end })
  group.forEach((s) => {
    s.facilityId = room.facilityId
  })
})

// 外出は個人の予定なので1件ずつ判定する(休暇は在席バッジで伝わるため対象外)
schedules
  .filter((s) => s.category === 'out')
  .forEach((s) => {
    if (!s.isAllDay && mulberry32(hashString(`private#${s.id}`))() < 0.2) s.isPrivate = true
  })

// デモの「自分」の非公開予定を1件保証する。「本人の予定は伏せない」分岐(utils/format.ts の
// isScheduleMasked)は所有者が自分の非公開予定でしか通らず、抽選任せだと0件になりうる
{
  const ownEvents = schedules.filter((s) => s.employeeId === SELF_EMPLOYEE_ID)
  const target = ownEvents.some((s) => s.isPrivate) ? undefined : ownEvents.find((s) => !s.isAllDay)
  if (target?.category === 'meeting') {
    // 会議は会議単位で非公開になるので、同じ会議に出ている全員ぶんへ同じ値を入れる
    const key = meetingKey(target)
    schedules
      .filter((s) => s.category === 'meeting' && meetingKey(s) === key)
      .forEach((s) => {
        s.isPrivate = true
      })
  } else if (target) {
    target.isPrivate = true
  }
}

// 会議室会議(時刻=分のみ・日付非依存でいつ見ても活性)。参加者は同じフロアの社員から抽選する
// (フロアを跨ぐ会議はデモの範囲外。予定側の会議室割り当てと同じ規則)
const FACILITY_MEETING_TITLES = ['定例会議', 'プロジェクト進捗', '部門ミーティング', '1on1', 'レビュー会', '打ち合わせ', 'ブレスト']
const facilityMeetings = []
let fmSeq = 1
FLOOR_DEFS.forEach(({ floorId }) => {
  const empIds = employees.filter((e) => floorIdByEmployeeId.get(e.id) === floorId).map((e) => e.id)
  if (empIds.length === 0) return // 社員の居ないフロアの室は会議を作らない(参加者を抽選できない)
  linkedByFloor.get(floorId).forEach((f) => {
    const rand = mulberry32(hashString(`fm-${f.id}`))
    const n = 1 + Math.floor(rand() * 3) // 1..3件
    const usedHours = new Set()
    for (let i = 0; i < n; i++) {
      let hour = 9 + Math.floor(rand() * 8) // 9..16 開始
      let guard = 0
      while (usedHours.has(hour) && guard < 10) {
        hour = 9 + Math.floor(rand() * 8)
        guard++
      }
      usedHours.add(hour)
      const pcount = 2 + Math.floor(rand() * 4) // 2..5名
      const picked = new Set()
      for (let k = 0; k < pcount; k++) picked.add(empIds[Math.floor(rand() * empIds.length)])
      const participantIds = [...picked]
      facilityMeetings.push({
        id: `fm-${pad4(fmSeq++)}`,
        facilityId: f.facilityId,
        title: FACILITY_MEETING_TITLES[Math.floor(rand() * FACILITY_MEETING_TITLES.length)],
        startMin: hour * 60,
        endMin: (hour + 1) * 60,
        organizerId: participantIds[0],
        participantIds,
      })
    }
  })
})

// ── 書き出し ────────────────────────────────────────────

mkdirSync(MOCKS_DIR, { recursive: true })
const dump = (dir, name, data) =>
  writeFileSync(join(MOCKS_DIR, dir, name), `${JSON.stringify(data, null, 2)}\n`)

// 社員・アバター・予定・会議室会議はフロアを跨ぐ一覧なので mocks/ 直下に1本だけ置く
dump('.', 'employees.json', employees)
dump('.', 'avatars.json', avatarRecords)
dump('.', 'schedules.json', schedules)
dump('.', 'facility-meetings.json', facilityMeetings)

// 座標を持つ3種はフロアごと。既定フロアは mocks/ 直下、それ以外は mocks/<dir>/ 配下
FLOOR_DEFS.forEach(({ floorId, dir }) => {
  mkdirSync(join(MOCKS_DIR, dir), { recursive: true })
  dump(dir, 'teams.json', teamsByFloor.get(floorId))
  dump(dir, 'seats.json', seatsByFloor.get(floorId))
  dump(dir, 'facilities.json', facilitiesByFloor.get(floorId))
})

const occupied = seats.filter((s) => s.employeeId).length
const occupancyPct = ((occupied / seats.length) * 100).toFixed(1)
console.log(`teams=${teams.length} employees=${employees.length} seats=${seats.length}(着席${occupied}/空席${seats.length - occupied}, 再席率${occupancyPct}%) facilities=${allFacilities.length} schedules=${schedules.length} facilityMeetings=${facilityMeetings.length}`)
console.log('フロア別 チーム/座席/施設(うち連携会議室):')
FLOOR_DEFS.forEach(({ floorId }) => {
  const linked = linkedByFloor.get(floorId)
  const fmCount = facilityMeetings.filter((m) => linked.some((f) => f.facilityId === m.facilityId)).length
  console.log(
    `  ${floorId}: teams=${teamsByFloor.get(floorId).length} seats=${seatsByFloor.get(floorId).length} facilities=${facilitiesByFloor.get(floorId).length}(連携${linked.length}: ${linked.map((f) => `${f.name}/${f.facilityId}`).join(',')}) 会議室会議=${fmCount}`
  )
})
const withPhone = employees.filter((e) => e.phone).length
console.log(`電話番号: あり${withPhone}/なし${employees.length - withPhone}`)
if (seatCountReport.length > 0) {
  console.log('座席数変化(20px余白適用により箱幅を変えず座席数を調整):')
  seatCountReport.forEach((r) => console.log(`  ${r.team}: ${r.before} -> ${r.after}`))
}
console.log('チーム別 列数×行数(収容数):')
seatGeometryReport.forEach((r) => console.log(`  ${r.team}: ${r.cols}×${r.rows} = ${r.capacity}`))
console.log(`teamZone: right=${teamZoneRight} top=${teamZoneTop} bottom=${teamZoneBottom}`)
console.log(`viewBox(算出): ${VIEWBOX_W}×${VIEWBOX_H}`)
const aisle = facilities.find((f) => f.kind === 'aisle')
console.log(`aisle: x=${aisle.x} y=${aisle.y} width=${aisle.width} height=${aisle.height}`)
