// mocks/ の JSON 5ファイル(employees/teams/seats/schedules/facilities)を決定論的に再生成する
// 実行: node scripts/generate-mocks.mjs
// 乱数は社員ID ハッシュ由来の seeded PRNG のみ。日付は BASE_DATE 固定で再現性を担保する

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MOCKS_DIR = join(__dirname, '..', 'mocks')

// 当日分の基準日(JST 固定)
const BASE_DATE = '2026-07-27'

// ── プール定義 ──────────────────────────────────────────

// 姓プール30種([漢字, カナ])
const SURNAMES = [
  ['青山', 'アオヤマ'], ['白石', 'シライシ'], ['高橋', 'タカハシ'], ['田中', 'タナカ'],
  ['中村', 'ナカムラ'], ['藤井', 'フジイ'], ['松本', 'マツモト'], ['井上', 'イノウエ'],
  ['木村', 'キムラ'], ['林', 'ハヤシ'], ['清水', 'シミズ'], ['山本', 'ヤマモト'],
  ['森田', 'モリタ'], ['小林', 'コバヤシ'], ['加藤', 'カトウ'], ['吉田', 'ヨシダ'],
  ['山田', 'ヤマダ'], ['佐々木', 'ササキ'], ['山口', 'ヤマグチ'], ['斉藤', 'サイトウ'],
  ['池田', 'イケダ'], ['橋本', 'ハシモト'], ['石川', 'イシカワ'], ['前田', 'マエダ'],
  ['藤原', 'フジワラ'], ['岡田', 'オカダ'], ['後藤', 'ゴトウ'], ['長谷川', 'ハセガワ'],
  ['村上', 'ムラカミ'], ['近藤', 'コンドウ'],
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
const TEAM_DEFS = [
  { name: '営業部', size: 8 },
  { name: '開発部', size: 8 },
  { name: '総務部', size: 7 },
  { name: '経理部', size: 7 },
  { name: '企画部', size: 6 },
]

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

// ── チーム生成 ──────────────────────────────────────────

// 座席サイズ・水平ピッチ(幅105+間隔18)。垂直は対面ペアを縦に積むため専用値を使う
const SEAT_W = 105
const SEAT_H = 75
const PITCH_X = SEAT_W + 18
// 各チーム=2行アイランド(前列=着席/後列=空席)。5帯を縦に積んで 900 に収めるため対面間隔を圧縮
const PAD_X = 12 // 水平内側パディング
const INNER_V = 8 // 上下内側パディング
const ROW_GAP = 10 // 対面ペアの行間
const ROW_PITCH = SEAT_H + ROW_GAP // 行ピッチ
const AREA_H = INNER_V * 2 + SEAT_H * 2 + ROW_GAP // アイランド高さ = 176
const BAND_TOP = 6
const BAND_PITCH = 178 // 帯ピッチ(AREA_H より大きく重なりなし)

const teams = []
const seats = []
let seatSeq = 1

TEAM_DEFS.forEach((def, i) => {
  const teamId = `team-${pad2(i + 1)}`
  // HSL 色相環を5等分(隣接衝突回避のオフセット12°付与)
  const color = hslToHex((i * 72 + 12) % 360, 0.5, 0.55)
  const cols = def.size // 前列 col 数 = メンバー数
  const areaW = cols * PITCH_X - 18 + PAD_X * 2
  const areaX = 30
  const areaY = BAND_TOP + i * BAND_PITCH
  teams.push({ id: teamId, name: def.name, color, area: { x: areaX, y: areaY, w: areaW, h: AREA_H } })

  // 2行 × cols 列。row0=前列(着席)、row1=後列(空席)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < cols; col++) {
      seats.push({
        id: `seat-${pad3(seatSeq++)}`,
        teamId,
        x: areaX + PAD_X + col * PITCH_X,
        y: areaY + INNER_V + row * ROW_PITCH,
        width: SEAT_W,
        height: SEAT_H,
        rotation: 0,
        // 着席は後の社員割当で埋める。ひとまず null
        employeeId: null,
      })
    }
  }
})

// ── 社員生成 ────────────────────────────────────────────

const employees = []
let empSeq = 1
// チームごとにメンバーを順次割当。チーム内 local index 0=部長 / 3=課長
TEAM_DEFS.forEach((def, ti) => {
  const teamId = `team-${pad2(ti + 1)}`
  for (let local = 0; local < def.size; local++) {
    const gi = empSeq - 1 // 通し index
    const [sk, skk] = SURNAMES[gi % SURNAMES.length]
    const [gk, gkk] = GIVENS[gi % GIVENS.length]
    const id = `emp-${pad3(empSeq)}`
    const position = local === 0 ? '部長' : local === 3 ? '課長' : undefined
    const surnameRoman = skk.toLowerCase()
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
      avatar,
    }
    employees.push(emp)
    empSeq++
  }
})

// 前列(row0)の座席へ、チーム順に社員を割当
{
  const empByTeam = {}
  employees.forEach((e) => {
    ;(empByTeam[e.teamId] ||= []).push(e.id)
  })
  const cursor = {}
  seats.forEach((s) => {
    // row0 = 前列のみ着席対象
    const team = teams.find((t) => t.id === s.teamId)
    const isFrontRow = s.y < team.area.y + INNER_V + ROW_PITCH - 1
    if (!isFrontRow) return
    const idx = (cursor[s.teamId] ||= 0)
    const pool = empByTeam[s.teamId]
    if (idx < pool.length) {
      s.employeeId = pool[idx]
      cursor[s.teamId] = idx + 1
    }
  })
}

// ── 施設生成 ────────────────────────────────────────────

// 右側ゾーン(x>=1030)に配置
const facilities = [
  { id: 'fac-01', name: '会議室A', kind: 'meeting', capacity: 4, x: 1030, y: 15, width: 250, height: 130 },
  { id: 'fac-02', name: '会議室B', kind: 'meeting', capacity: 6, x: 1030, y: 165, width: 250, height: 150 },
  { id: 'fac-03', name: '会議室C', kind: 'meeting', capacity: 8, x: 1030, y: 335, width: 250, height: 175 },
  { id: 'fac-04', name: '会議室D', kind: 'meeting', capacity: 12, x: 1030, y: 530, width: 250, height: 210 },
  { id: 'fac-05', name: '応接室', kind: 'meeting', capacity: 6, x: 1030, y: 760, width: 250, height: 120 },
  { id: 'fac-06', name: '電話ブース1', kind: 'booth', x: 1310, y: 15, width: 120, height: 110 },
  { id: 'fac-07', name: '電話ブース2', kind: 'booth', x: 1310, y: 145, width: 120, height: 110 },
  { id: 'fac-08', name: 'リフレッシュスペース', kind: 'common', x: 1310, y: 285, width: 270, height: 220 },
]

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

// ── 書き出し ────────────────────────────────────────────

mkdirSync(MOCKS_DIR, { recursive: true })
const dump = (name, data) =>
  writeFileSync(join(MOCKS_DIR, name), `${JSON.stringify(data, null, 2)}\n`)

dump('teams.json', teams)
dump('employees.json', employees)
dump('seats.json', seats)
dump('facilities.json', facilities)
dump('schedules.json', schedules)

const occupied = seats.filter((s) => s.employeeId).length
console.log(`teams=${teams.length} employees=${employees.length} seats=${seats.length}(着席${occupied}/空席${seats.length - occupied}) facilities=${facilities.length} schedules=${schedules.length}`)
