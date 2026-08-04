// 10/11: 会議室の予約は本来日付非依存(FacilityMeeting型に日付フィールドが無い)なので、
// 日付を切り替えても内容が変わるよう、日付別の予約一覧をここで決定論的に導出する

import type { FacilityMeeting } from '@/types'
import type { JstDate } from '@/utils/jst-date'
import { jstWeekday } from '@/utils/jst-date'
import { hashStringToInt } from '@/utils/hash-string'

// 予定を敷き詰めるグリッド(09:00〜17:30・30分刻み)
const GRID_START_MIN = 9 * 60
const GRID_END_MIN = 17 * 60 + 30
const SLOT_MIN = 30

// 会議の長さ候補(分)
const DURATION_CANDIDATES = [30, 60, 90]

// 件名プール
const TITLE_POOL = ['定例会議', 'プロジェクト進捗', '1on1', '部門ミーティング', '打ち合わせ', '研修', '採用面接']

// 平日/週末で変わる件数上限(この値+1件までを乱数で選ぶ。0件を含む)
const WEEKDAY_MAX_COUNT = 4
const WEEKEND_MAX_COUNT = 1

// 参加者は主催者を除いて2〜6名(PARTICIPANT_EXTRA_SPAN=5通り: 2,3,4,5,6)
const PARTICIPANT_EXTRA_MIN = 2
const PARTICIPANT_EXTRA_SPAN = 5

// 線形合同法のパラメータ(定番値)
const LCG_MULTIPLIER = 1664525
const LCG_INCREMENT = 1013904223

// 32bit整数の乱数状態を1段階進める
const nextLcgState = (state: number): number => (Math.imul(state, LCG_MULTIPLIER) + LCG_INCREMENT) | 0

// dateKey(YYYY-MM-DD)をJST暦日へ変換する。曜日判定のみに使う
const parseDateKey = (dateKey: string): JstDate => {
  const [y, m, d] = dateKey.split('-').map(Number)
  return { y, m, d }
}

// 09:00〜17:30の30分刻みの開始候補を列挙する
const buildSlotStarts = (): number[] => {
  const starts: number[] = []
  for (let t = GRID_START_MIN; t < GRID_END_MIN; t += SLOT_MIN) starts.push(t)
  return starts
}

// 2つの時間範囲が重なっているか
const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
  aStart < bEnd && bStart < aEnd

// poolから重複なしでcount件選ぶ。pullは0以上max未満の整数を返す関数
const pickDistinct = <T,>(pool: T[], count: number, pull: (max: number) => number): T[] => {
  const remaining = [...pool]
  const picked: T[] = []
  const n = Math.min(count, remaining.length)
  for (let i = 0; i < n; i += 1) {
    const idx = pull(remaining.length)
    picked.push(remaining[idx])
    remaining.splice(idx, 1)
  }
  return picked
}

// 会議室×日付ごとの予約一覧を決定論的に導出する純関数。Date.now()・Math.random()は使わない
// dateKeyがtodayKeyと一致する時は種データ(mocks/facility-meetings.json由来)をそのまま使う
// (キャンバスの状態色・ホバーカードが本日基準で動いているため、ここを変えると回帰する)
// それ以外は`${dateKey}#${facilityId}`を種にした線形合同法で毎回同じ結果を生成する
export const meetingsForDate = (
  seed: FacilityMeeting[],
  facilityId: string,
  dateKey: string,
  todayKey: string,
  employeeIds: string[]
): FacilityMeeting[] => {
  const seedForFacility = seed.filter((m) => m.facilityId === facilityId)

  if (dateKey === todayKey) {
    return [...seedForFacility].sort((a, b) => a.startMin - b.startMin)
  }

  if (employeeIds.length === 0) return []

  let state = hashStringToInt(`${dateKey}#${facilityId}`)
  const pull = (max: number): number => {
    state = nextLcgState(state)
    return (state >>> 0) % max
  }

  const weekday = jstWeekday(parseDateKey(dateKey))
  const isWeekend = weekday === 0 || weekday === 6
  const maxCount = isWeekend ? WEEKEND_MAX_COUNT : WEEKDAY_MAX_COUNT
  const count = pull(maxCount + 1)

  const allStarts = buildSlotStarts()
  const placed: { startMin: number; endMin: number }[] = []
  const meetings: FacilityMeeting[] = []

  for (let i = 0; i < count; i += 1) {
    const duration = DURATION_CANDIDATES[pull(DURATION_CANDIDATES.length)]
    const candidates = allStarts.filter(
      (s) => s + duration <= GRID_END_MIN && !placed.some((p) => overlaps(s, s + duration, p.startMin, p.endMin))
    )
    if (candidates.length === 0) break

    const startMin = candidates[pull(candidates.length)]
    const endMin = startMin + duration
    placed.push({ startMin, endMin })

    const title = TITLE_POOL[pull(TITLE_POOL.length)]
    const organizerId = pickDistinct(employeeIds, 1, pull)[0]
    const participantExtraCount = PARTICIPANT_EXTRA_MIN + pull(PARTICIPANT_EXTRA_SPAN)
    const others = pickDistinct(
      employeeIds.filter((id) => id !== organizerId),
      participantExtraCount,
      pull
    )

    meetings.push({
      id: `fm-${dateKey}-${facilityId}-${i}`,
      facilityId,
      title,
      startMin,
      endMin,
      organizerId,
      participantIds: [organizerId, ...others],
    })
  }

  return meetings.sort((a, b) => a.startMin - b.startMin)
}
