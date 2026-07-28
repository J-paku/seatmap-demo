// mocks/ の JSON 5ファイル(employees/teams/seats/schedules/facilities)を決定論的に再生成する
// 実行: node scripts/generate-mocks.mjs
// 乱数は社員ID/チームidPrefix ハッシュ由来の seeded PRNG のみ。日付は BASE_DATE 固定で再現性を担保する

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MOCKS_DIR = join(__dirname, '..', 'mocks')

// 当日分の基準日(JST 固定)
const BASE_DATE = '2026-07-27'

// ── プール定義 ──────────────────────────────────────────

// 姓プール30種([漢字, カナ, ヘボン式ローマ字])
// ローマ字はメールアドレスの local part 生成専用(長音・撥音・拗音を字面通りではなくヘボン式で表記)
const SURNAMES = [
  ['青山', 'アオヤマ', 'aoyama'], ['白石', 'シライシ', 'shiraishi'], ['高橋', 'タカハシ', 'takahashi'], ['田中', 'タナカ', 'tanaka'],
  ['中村', 'ナカムラ', 'nakamura'], ['藤井', 'フジイ', 'fujii'], ['松本', 'マツモト', 'matsumoto'], ['井上', 'イノウエ', 'inoue'],
  ['木村', 'キムラ', 'kimura'], ['林', 'ハヤシ', 'hayashi'], ['清水', 'シミズ', 'shimizu'], ['山本', 'ヤマモト', 'yamamoto'],
  ['森田', 'モリタ', 'morita'], ['小林', 'コバヤシ', 'kobayashi'], ['加藤', 'カトウ', 'kato'], ['吉田', 'ヨシダ', 'yoshida'],
  ['山田', 'ヤマダ', 'yamada'], ['佐々木', 'ササキ', 'sasaki'], ['山口', 'ヤマグチ', 'yamaguchi'], ['斉藤', 'サイトウ', 'saito'],
  ['池田', 'イケダ', 'ikeda'], ['橋本', 'ハシモト', 'hashimoto'], ['石川', 'イシカワ', 'ishikawa'], ['前田', 'マエダ', 'maeda'],
  ['藤原', 'フジワラ', 'fujiwara'], ['岡田', 'オカダ', 'okada'], ['後藤', 'ゴトウ', 'goto'], ['長谷川', 'ハセガワ', 'hasegawa'],
  ['村上', 'ムラカミ', 'murakami'], ['近藤', 'コンドウ', 'kondo'],
]

// 名プール20種([漢字, カナ])
const GIVENS = [
  ['健太', 'ケンタ'], ['美咲', 'ミサキ'], ['翔太', 'ショウタ'], ['結衣', 'ユイ'],
  ['大輔', 'ダイスケ'], ['さくら', 'サクラ'], ['直樹', 'ナオキ'], ['陽子', 'ヨウコ'],
  ['拓也', 'タクヤ'], ['愛', 'アイ'], ['亮', 'リョウ'], ['恵', 'メグミ'],
  ['誠', 'マコト'], ['遥', 'ハルカ'], ['智也', 'トモヤ'], ['由美', 'ユミ'],
  ['健一', 'ケンイチ'], ['彩', 'アヤ'], ['康弘', 'ヤスヒロ'], ['麻衣', 'マイ'],
]

// チーム定義(名称順が定義順 team-01..05)
// idPrefix: 座席ID接頭辞(11-layout-pipeline.md — seat.id.startsWith(idPrefix + '-') が唯一の結束キー)
// size: 箱幅算出専用の想定列数(座席2行化に合わせて箱高だけ変更・幅はここを据え置いて7/7/6/6/5列を維持)
// empCount: 実際の社員数(再席率70%前後に合わせて size とは独立に増員)
const TEAM_DEFS = [
  { name: '営業部', size: 8, empCount: 10, idPrefix: 'dept-sales' },
  { name: '開発部', size: 8, empCount: 10, idPrefix: 'dept-dev' },
  { name: '総務部', size: 7, empCount: 9, idPrefix: 'dept-general' },
  { name: '経理部', size: 7, empCount: 8, idPrefix: 'dept-account' },
  { name: '企画部', size: 6, empCount: 7, idPrefix: 'dept-planning' },
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

const pad3 = (n) => String(n).padStart(3, '0')
const pad2 = (n) => String(n).padStart(2, '0')
const pad4 = (n) => String(n).padStart(4, '0')

// 社員IDから携帯電話番号を決定論的に生成(数字のみで保持し、tel:リンク・表示整形の両方を単一値で賄う)
// 約20%判定(実結果は15〜20%レンジに収まる)は電話番号なしとし、詳細パネルの未設定表示分岐を実データで踏ませる
const buildPhone = (empId) => {
  const rand = mulberry32(hashString(`phone-${empId}`))
  if (rand() < 0.2) return undefined
  const prefix = MOBILE_PREFIXES[Math.floor(rand() * MOBILE_PREFIXES.length)]
  let rest = ''
  for (let i = 0; i < 8; i++) rest += Math.floor(rand() * 10)
  return `${prefix}${rest}`
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
const seatCountReport = [] // 検証・報告用: 座席数が変化したチームを記録
const seatGeometryReport = [] // 検証・報告用: チームごとの列数×行数×収容数

TEAM_DEFS.forEach((def, i) => {
  const teamId = `team-${pad2(i + 1)}`
  const idPrefix = def.idPrefix
  // HSL 色相環を5等分(隣接衝突回避のオフセット12°付与)
  const color = hslToHex((i * 72 + 12) % 360, 0.5, 0.55)
  const cols = def.size // 箱幅算出用の想定列数(メンバー数)
  const areaW = cols * PITCH_X - 18 + BOX_PAD_X * 2
  const areaX = 30
  const areaY = BAND_TOP + i * BAND_PITCH
  const area = { x: areaX, y: areaY, w: areaW, h: AREA_H }
  teams.push({ id: teamId, idPrefix, name: def.name, color, area })

  // 余白20・列ピッチ123・行ピッチ95で実際に入る列数/行数を capacity 式から算出
  const colsMax = Math.floor((areaW - 2 * LAYOUT_PADDING + 18) / PITCH_X)
  const rowsMax = Math.floor((AREA_H - 2 * LAYOUT_PADDING + LAYOUT_ROW_GAP) / PITCH_Y)
  const actualCols = Math.min(cols, Math.max(colsMax, 0))
  const actualRows = Math.min(2, Math.max(rowsMax, 0)) // 元設計は前列(着席)+後列(空席)の2行

  const before = cols * 2
  const after = actualCols * actualRows
  if (after !== before) seatCountReport.push({ team: def.name, before, after })

  // row0(前列)・row1(後列)とも座席を生成する。着席/空席の割当は後段でチームごとに分散させる
  let seatSeq = 1 // 座席ID連番はチームごとに再スタート
  for (let row = 0; row < actualRows; row++) {
    for (let col = 0; col < actualCols; col++) {
      seats.push({
        id: `${idPrefix}-${pad3(seatSeq++)}`,
        teamId,
        x: areaX + LAYOUT_PADDING + col * PITCH_X,
        y: areaY + LAYOUT_PADDING + row * PITCH_Y,
        width: SEAT_W,
        height: SEAT_H,
        rotation: 0,
        // 着席は後の社員割当で埋める。ひとまず null
        employeeId: null,
      })
    }
  }

  seatGeometryReport.push({ team: def.name, cols: actualCols, rows: actualRows, capacity: actualCols * actualRows })
})

// ── 社員生成 ────────────────────────────────────────────

const employees = []
let empSeq = 1
// チームごとにメンバーを順次割当。チーム内 local index 0=部長 / 3=課長
TEAM_DEFS.forEach((def, ti) => {
  const teamId = `team-${pad2(ti + 1)}`
  for (let local = 0; local < def.empCount; local++) {
    const gi = empSeq - 1 // 通し index
    const [sk, skk, skr] = SURNAMES[gi % SURNAMES.length]
    const [gk, gkk] = GIVENS[gi % GIVENS.length]
    const id = `emp-${pad3(empSeq)}`
    const position = local === 0 ? '部長' : local === 3 ? '課長' : undefined
    const surnameRoman = skr
    const phone = buildPhone(id)
    const avatar = {
      hair: HAIRS[gi % HAIRS.length],
      face: FACES[gi % FACES.length],
      outfit: OUTFITS[gi % OUTFITS.length],
      palette: {
        hair: HAIR_COLORS[gi % HAIR_COLORS.length],
        skin: SKIN_COLORS[gi % SKIN_COLORS.length],
        outfit: OUTFIT_COLORS[gi % OUTFIT_COLORS.length],
      },
    }
    // 表示名は実名ではなく「部署名+連番」(例: 営業部1)。検索用 nameKana も同値
    const displayName = `${def.name}${local + 1}`
    const emp = {
      id,
      name: displayName,
      nameKana: displayName,
      teamId,
      ...(position ? { position } : {}),
      email: `${surnameRoman}${pad3(empSeq)}@example.co.jp`,
      ...(phone ? { phone } : {}),
      avatar,
    }
    employees.push(emp)
    empSeq++
  }
})

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

// チームゾーンの実測境界(箱が縦に伸びたぶん、これを起点に通路・施設列を組み立てる)
const teamZoneRight = Math.max(...teams.map((t) => t.area.x + t.area.w))
const teamZoneTop = Math.min(...teams.map((t) => t.area.y))
const teamZoneBottom = Math.max(...teams.map((t) => t.area.y + t.area.h))

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

// viewBox からはみ出す施設が無いかを検査(はみ出す場合は黙って切り詰めず報告する)
const facilityOverflow = facilities.filter((f) => f.x < 0 || f.y < 0 || f.x + f.width > VIEWBOX_W || f.y + f.height > VIEWBOX_H)
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
  const count = Math.floor(rand() * 4) // 0..3
  if (count === 0) return

  // 休暇(20%)判定: 発生したら終日1件のみ・他と排他
  const isVacation = rand() < 0.2
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
// 会議室に facilityId を付与(応接室 fac-05 のみ未連携=施設未連携デモ)
facilities.forEach((f) => {
  if (f.kind === 'meeting' && f.id !== 'fac-05') f.facilityId = `F-${f.id.slice(-2)}`
})

// 会議室会議(時刻=分のみ・日付非依存でいつ見ても活性)。参加者は社員から抽選
const FACILITY_MEETING_TITLES = ['定例会議', 'プロジェクト進捗', '部門ミーティング', '1on1', 'レビュー会', '打ち合わせ', 'ブレスト']
const empIds = employees.map((e) => e.id)
const facilityMeetings = []
let fmSeq = 1
facilities
  .filter((f) => f.facilityId)
  .forEach((f) => {
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

// ── 書き出し ────────────────────────────────────────────

mkdirSync(MOCKS_DIR, { recursive: true })
const dump = (name, data) =>
  writeFileSync(join(MOCKS_DIR, name), `${JSON.stringify(data, null, 2)}\n`)

dump('teams.json', teams)
dump('employees.json', employees)
dump('seats.json', seats)
dump('facilities.json', facilities)
dump('schedules.json', schedules)
dump('facility-meetings.json', facilityMeetings)

const occupied = seats.filter((s) => s.employeeId).length
const occupancyPct = ((occupied / seats.length) * 100).toFixed(1)
console.log(`teams=${teams.length} employees=${employees.length} seats=${seats.length}(着席${occupied}/空席${seats.length - occupied}, 再席率${occupancyPct}%) facilities=${facilities.length} schedules=${schedules.length} facilityMeetings=${facilityMeetings.length}`)
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
