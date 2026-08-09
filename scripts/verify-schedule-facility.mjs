// 予定と会議室の不変条件を mocks/ の実データで検査する
// 実行: node scripts/verify-schedule-facility.mjs
//
// 会議室は同じ時間帯に二重予約できず、定員も超えられない。これはコード側の分岐ではなく
// データの不変条件なので、型チェックでも画面確認でも落ちない。ここで機械的に見る
// 判定式(会議の同一性・重なり・定員)は生成側と共有する scripts/lib/meeting-rules.mjs のもの

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fitsCapacity, isOverlapping, isSameMeeting, meetingKey } from './lib/meeting-rules.mjs'
import { SELF_EMPLOYEE_ID } from './lib/demo-identity.mjs'

const MOCKS = join(dirname(fileURLToPath(import.meta.url)), '..', 'mocks')
const read = (...p) => JSON.parse(readFileSync(join(MOCKS, ...p), 'utf-8'))

// フロアの列挙。既定フロアは mocks/ 直下、それ以外は facilities.json を持つ配下ディレクトリ。
// 一覧を書き並べるとフロアを足した時に更新漏れがそのまま検査漏れになるので、走査で出す
const floorDirs = [
  '.',
  ...readdirSync(MOCKS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(MOCKS, entry.name, 'facilities.json')))
    .map((entry) => entry.name)
    .sort(),
]

const schedules = read('schedules.json')
const facilityMeetings = read('facility-meetings.json')
const facilitiesByFloor = new Map(floorDirs.map((dir) => [dir, read(dir, 'facilities.json')]))

const failures = []
const fail = (msg) => failures.push(msg)

// 施設ID→施設。フロアを跨いで同じIDがあると後から重ねた側が消えて検査もすり抜けるので、
// 重ねる前に衝突そのものを失敗として出す(採番規則がフロアごとに割れていないかの検査)
const linked = new Map()
for (const [dir, list] of facilitiesByFloor) {
  for (const f of list) {
    if (!f.facilityId) continue
    const duplicated = linked.get(f.facilityId)
    if (duplicated) fail(`施設IDの重複: ${f.facilityId} を ${duplicated.name}(${duplicated.floorDir}) と ${f.name}(${dir}) が持っている`)
    else linked.set(f.facilityId, { ...f, floorDir: dir })
  }
}

// 施設名の表示。未連携・実在しないIDでも落ちないようにする
// (ここで落ちると、この行より後ろの検査結果と failures の出力ごと消える)
const roomLabel = (facilityId) => linked.get(facilityId)?.name ?? `(実在しない施設ID ${facilityId})`

// 1. 予定が指す施設IDが実在するか(施設未連携の会議室・通路を指していないか)
for (const ev of schedules) {
  if (!ev.facilityId) continue
  if (!linked.has(ev.facilityId)) fail(`${ev.id}: 実在しない施設ID ${ev.facilityId}`)
  if (ev.category !== 'meeting') fail(`${ev.id}: 区分 ${ev.category} が会議室を押さえている`)
}

// 2. 同じ会議(同時刻・同件名)は1室にまとまっているか
const groups = new Map()
for (const ev of schedules) {
  if (ev.category !== 'meeting') continue
  const key = meetingKey(ev)
  const g = groups.get(key)
  if (g) g.push(ev)
  else groups.set(key, [ev])
}
for (const [key, group] of groups) {
  const rooms = new Set(group.map((ev) => ev.facilityId ?? '(なし)'))
  if (rooms.size > 1) fail(`同じ会議が複数の室に分かれている: ${key} → ${[...rooms].join(',')}`)
  const room = linked.get(group[0].facilityId)
  if (room && !fitsCapacity(room, group.length)) {
    fail(`定員超過: ${room.name} 定員${room.capacity} < 参加${group.length}名 (${key})`)
  }
}

// 3. 同じ室で時間帯が重なる別会議が無いか(二重予約)
const byRoom = new Map()
for (const ev of schedules) {
  if (!ev.facilityId) continue
  const list = byRoom.get(ev.facilityId)
  if (list) list.push(ev)
  else byRoom.set(ev.facilityId, [ev])
}
for (const [facilityId, list] of byRoom) {
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i]
      const b = list[j]
      if (!isSameMeeting(a, b) && isOverlapping(a.start, a.end, b.start, b.end)) {
        fail(`二重予約: ${roomLabel(facilityId)} ${a.id}(${a.start.slice(11, 16)}) と ${b.id}(${b.start.slice(11, 16)})`)
      }
    }
  }
}

// 4. 画面の分岐が実データで一度も通らない状態を防ぐ(件数の合計ではなく、分岐ごとに1件以上あるかを見る)。
// 非公開予定は所有者が本人かどうかで表示が割れる(utils/format.ts の isScheduleMasked)ため、
// 総数だけ見ると片方の分岐が0件でも通ってしまう
const privateEvents = schedules.filter((ev) => ev.isPrivate)
const privateSelf = privateEvents.filter((ev) => ev.employeeId === SELF_EMPLOYEE_ID)
const privateOthers = privateEvents.filter((ev) => ev.employeeId !== SELF_EMPLOYEE_ID)
const withFacilityCount = schedules.filter((ev) => ev.facilityId).length
if (privateOthers.length === 0) fail('他人の非公開予定が0件(件名マスク表示を実データで確認できない)')
if (privateSelf.length === 0) {
  fail(`本人(${SELF_EMPLOYEE_ID})の非公開予定が0件(「本人の予定は伏せない」分岐を実データで通せない)`)
}
if (withFacilityCount === 0) fail('会議室を押さえた予定が0件')

// 5. 会議室会議(facility-meetings.json)がフロアごとに実在するか。
// 連携済みなのに会議0件の室は、実行時に何時に見ても空室で「使用中」表示が一度も出ない
const meetingCountByFacility = new Map()
for (const m of facilityMeetings) {
  if (!linked.has(m.facilityId)) fail(`${m.id}: 実在しない施設ID ${m.facilityId}`)
  meetingCountByFacility.set(m.facilityId, (meetingCountByFacility.get(m.facilityId) ?? 0) + 1)
}
const floorReport = floorDirs.map((dir) => {
  const rooms = facilitiesByFloor.get(dir).filter((f) => f.facilityId)
  for (const room of rooms) {
    if ((meetingCountByFacility.get(room.facilityId) ?? 0) === 0) {
      fail(`${dir} の ${room.name}(${room.facilityId}): 会議室会議が0件(常に空室になる)`)
    }
  }
  return {
    floor: dir,
    linkedRooms: rooms.map((room) => `${room.name}/${room.facilityId}`),
    facilityMeetings: rooms.reduce((sum, room) => sum + (meetingCountByFacility.get(room.facilityId) ?? 0), 0),
    scheduleBookings: rooms.reduce((sum, room) => sum + (byRoom.get(room.facilityId)?.length ?? 0), 0),
  }
})

const verdict = failures.length === 0 ? 'PASS' : 'FAIL'
console.log(
  JSON.stringify(
    {
      verdict,
      floors: floorReport,
      schedules: schedules.length,
      withFacility: withFacilityCount,
      private: { total: privateEvents.length, self: privateSelf.length, others: privateOthers.length },
      failures,
    },
    null,
    2
  )
)
process.exit(failures.length === 0 ? 0 : 1)
