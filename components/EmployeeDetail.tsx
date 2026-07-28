import { useEffect, useMemo, useRef, useState } from 'react'
import { PixelAvatar } from './PixelAvatar'
import { PresenceBadge } from './StatusChip'
import { DateNavigator } from './DateNavigator'
import { SwipeDateStage } from './SwipeDateStage'
import { useEmployees, useSchedules, useSeats, useTeams } from '@/lib/mock-loader'
import { computePresenceMap } from '@/lib/presence'
import { useQuantizedClock } from '@/lib/use-quantized-clock'
import { scheduleTimeLabel } from '@/lib/format'
import { useDetailPanel } from '@/lib/detail-panel-context'
import { isSameJstDate, jstDateKey, jstKeyFromIso, useSelectedDate } from '@/lib/selected-date-context'
import { useSelfAvatar } from '@/lib/self-avatar-context'

type Props = {
  seatId: string
}

type ContactField = 'email' | 'phone'

// 新規スケジュール取得後の再ボタン活性化までの秒数(原本の正確な値は未取得のためデモ既定値)
const REFRESH_COOLDOWN_SECONDS = 10

// 電話番号(数字のみ11桁)を 3-4-4 区切りで表示整形
const formatPhone = (digits: string): string =>
  digits.length === 11 ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}` : digits

// 12-member-detail: 社員詳細(座席詳細兼用)。空席時は空席表記のみ
export const EmployeeDetail = ({ seatId }: Props) => {
  const { data: seats } = useSeats()
  const { data: employees } = useEmployees()
  const { data: teams } = useTeams()
  const { data: schedules, error: scheduleError } = useSchedules()
  const { date, debouncedDate, isTodaySelected, goToPrevDay, goToNextDay, goToToday } = useSelectedDate()
  const nowMs = useQuantizedClock(isTodaySelected)
  const { openScheduleDetail } = useDetailPanel()
  const { resolveAvatar } = useSelfAvatar()

  const [copiedField, setCopiedField] = useState<ContactField | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const copyTimeoutRef = useRef<number | null>(null)
  const refreshTimeoutRef = useRef<number | null>(null)

  const seat = seats?.find((s) => s.id === seatId)
  const employee = seat?.employeeId ? employees?.find((e) => e.id === seat.employeeId) : null
  const team = employee ? teams?.find((t) => t.id === employee.teamId) : null

  // debouncedDate 当日分の予定に絞って時刻順に並べる
  const mySchedules = useMemo(() => {
    const key = jstDateKey(debouncedDate)
    return (schedules ?? [])
      .filter((s) => employee && s.employeeId === employee.id && jstKeyFromIso(s.start) === key)
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [schedules, employee, debouncedDate])

  // 未定義のままにする(イベントなし=優先度4のフォールバックへ回す。'present' で埋めない)
  const status = useMemo(() => {
    if (!employee) return undefined
    return computePresenceMap(mySchedules, nowMs, isTodaySelected).get(employee.id)
  }, [mySchedules, nowMs, isTodaySelected, employee])

  // 表示日と確定取得日がずれている間はローディング扱い(ちらつき防止)
  const dateSwitching = !isSameJstDate(date, debouncedDate)
  const isScheduleLoading = isRefreshing || dateSwitching

  // パネルを閉じる(=アンマウント)と選択日を今日へリセット(パネル内限定の状態)
  useEffect(() => () => goToToday(), [goToToday])

  useEffect(
    () => () => {
      if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current)
      if (refreshTimeoutRef.current !== null) window.clearTimeout(refreshTimeoutRef.current)
    },
    []
  )

  // 秒単位カウントダウン
  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000)
    return () => window.clearInterval(id)
  }, [cooldown])

  const handleCopy = (field: ContactField, value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopiedField(field)
        if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current)
        copyTimeoutRef.current = window.setTimeout(() => setCopiedField(null), 1600)
      })
      .catch(() => {
        // 失敗時は静かに無視(スペック指定)
      })
  }

  const handleRefresh = () => {
    if (isRefreshing || cooldown > 0) return
    setIsRefreshing(true)
    const delay = 300 + Math.floor(Math.random() * 300)
    refreshTimeoutRef.current = window.setTimeout(() => {
      setIsRefreshing(false)
      setCooldown(REFRESH_COOLDOWN_SECONDS)
    }, delay)
  }

  if (!seat) return null

  return (
    <div className='employee-detail'>
      {!employee ? (
        <p className='seat-vacant-notice'>この座席は現在空席です</p>
      ) : (
        <>
          <div className='profile-card'>
            <div className='profile-band'>
              <PresenceBadge
                visible={!!seat.id && isTodaySelected}
                isLoading={isScheduleLoading}
                isOccupied
                status={status}
              />
              <div className='profile-avatar-frame'>
                <PixelAvatar config={resolveAvatar(employee.id, employee.avatar)} size={52} />
              </div>
            </div>
            <div className='profile-body'>
              <div className='profile-text-stack'>
                <div className='profile-name-kana'>
                  <span className='profile-name'>{employee.name}</span>
                  {employee.nameKana && <span className='profile-kana'>{employee.nameKana}</span>}
                </div>
                {employee.position && <span className='profile-role'>{employee.position}</span>}
                {team && <span className='profile-dept'>{team.name}</span>}
              </div>

              {(employee.email || employee.phone) && (
                <div className='profile-contacts'>
                  {employee.email && (
                    <div className='contact-row'>
                      <span className='material-symbols-outlined contact-icon'>mail</span>
                      <span className='contact-value'>{employee.email}</span>
                      <button
                        type='button'
                        className={`contact-copy-btn${copiedField === 'email' ? ' is-copied' : ''}`}
                        aria-label='メールアドレスをコピー'
                        onClick={() => handleCopy('email', employee.email as string)}
                      >
                        <span className='material-symbols-outlined' style={{ fontSize: 16 }}>
                          {copiedField === 'email' ? 'check' : 'content_copy'}
                        </span>
                      </button>
                      {copiedField === 'email' && <span className='contact-copy-bubble'>コピーしました</span>}
                    </div>
                  )}
                  {employee.phone && (
                    <div className='contact-row'>
                      <span className='material-symbols-outlined contact-icon'>call</span>
                      <a className='contact-value contact-value-link' href={`tel:${employee.phone}`}>
                        {formatPhone(employee.phone)}
                      </a>
                      <button
                        type='button'
                        className={`contact-copy-btn${copiedField === 'phone' ? ' is-copied' : ''}`}
                        aria-label='電話番号をコピー'
                        onClick={() => handleCopy('phone', formatPhone(employee.phone as string))}
                      >
                        <span className='material-symbols-outlined' style={{ fontSize: 16 }}>
                          {copiedField === 'phone' ? 'check' : 'content_copy'}
                        </span>
                      </button>
                      {copiedField === 'phone' && <span className='contact-copy-bubble'>コピーしました</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 座席へ移動ボタン/座席未設定文言はこのデモの侵入経路(座席カード・キャンバス)では発生しないため
              アクションバー自体を描画しない(スペック: 該当なしなら非表示) */}

          <section className='schedule-section'>
            <div className='schedule-section-label'>
              <span className='material-symbols-outlined schedule-section-icon'>calendar_today</span>
              <span className='schedule-section-title'>スケジュール</span>
              <span className='schedule-section-hairline' />
            </div>

            <DateNavigator />

            <div className='schedule-swipe-wrap'>
              <SwipeDateStage cardKey={jstDateKey(debouncedDate)} onSwipePrevDay={goToPrevDay} onSwipeNextDay={goToNextDay}>
                <div className='schedule-card'>
                  <button
                    type='button'
                    className='schedule-refresh-btn'
                    aria-label='スケジュールを更新'
                    disabled={isRefreshing || cooldown > 0}
                    onClick={handleRefresh}
                  >
                    {cooldown > 0 ? (
                      <>
                        <span className='material-symbols-outlined' style={{ fontSize: 16 }}>
                          refresh
                        </span>
                        <span className='schedule-refresh-cooldown'>{cooldown}s</span>
                      </>
                    ) : (
                      <span className='material-symbols-outlined' style={{ fontSize: 20 }}>
                        refresh
                      </span>
                    )}
                  </button>

                  {scheduleError ? (
                    <div className='schedule-error'>
                      <span className='material-symbols-outlined' style={{ fontSize: 20 }}>
                        error
                      </span>
                      <span>取得に失敗しました</span>
                    </div>
                  ) : (
                    <>
                      {mySchedules.length > 0 && (
                        <ul className='schedule-list'>
                          {mySchedules.map((ev) => (
                            <li key={ev.id}>
                              <button type='button' className='schedule-row' onClick={() => openScheduleDetail(ev.id)}>
                                <span className={`schedule-time${ev.isAllDay ? ' is-allday' : ''}`}>
                                  {scheduleTimeLabel(ev)}
                                </span>
                                <span className='schedule-title'>{ev.title || '予定あり'}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {mySchedules.length === 0 && !isScheduleLoading && (
                        <p className='schedule-empty'>{isTodaySelected ? '今日の予定はありません' : '予定はありません'}</p>
                      )}
                      {isScheduleLoading && (
                        <div className={`schedule-loading${mySchedules.length > 0 ? ' schedule-loading-overlay' : ' schedule-loading-center'}`}>
                          <span className='schedule-spinner' />
                          <span>読み取り中です</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </SwipeDateStage>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
