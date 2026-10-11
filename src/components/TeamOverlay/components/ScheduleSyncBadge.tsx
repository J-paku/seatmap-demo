import styles from '../team-overlay-modal.module.css'
import { useQuantizedClock } from '@/hooks/use-quantized-clock'
import { jstClockLabel } from '@/utils/format'
import { triggerHaptic } from '@/utils/haptic'
import { GaroonSyncNote } from '@/components/GaroonSyncNote'

// 座席配置ヘッダーの直下に出す同期状態バッジ。反映時刻と鮮度、再取得の入口を1行で持つ
//
// 「いつのスケジュールを見ているか」は席の在席表示の前提になるので、時刻(HH:MM)だけでなく
// 相対経過(N分前)も併記する。時刻だけだと今が何時か覚えていない利用者には古さが伝わらない
//
// 再取得の状態(実行中・クールタイム・最終取得時刻)は呼び出し側が持ち、ここは受け取った値を
// 描くだけで自前の時刻状態を持たない。相対表記の更新に使う現在時刻だけが例外

type Props = {
  // スケジュール取得中(オーバーレイを開いた直後の読込 or 再取得の実行中)
  isLoading: boolean
  // 最終取得時刻(epoch ms)。静的書き出し時はブラウザで初めて値が入るため null を取りうる
  lastUpdatedMs: number | null
  // 再取得の待ち秒数。0 より大きい間は押せない
  cooldown: number
  onRetry: () => void
  // モバイルだけグリッドの左右パディングに合わせて縦線を揃える(デスクトップは 0)
  sidePadding: number
}

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000

// 最終取得からの経過を相対表記へ整形する
const relativeLabel = (lastUpdatedMs: number, nowMs: number): string => {
  const diffMin = Math.floor(Math.max(0, nowMs - lastUpdatedMs) / MINUTE_MS)
  if (diffMin < 1) return 'たった今'
  if (diffMin < 60) return `${diffMin}分前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}時間前`
  return `${Math.floor(diffHour / 24)}日前`
}

// 鮮度の色分け。2時間までは控えめなグレー、そこから警告色→危険色へ段階的に上げる
const relativeToneClass = (lastUpdatedMs: number, nowMs: number): string => {
  const diffHour = Math.max(0, nowMs - lastUpdatedMs) / HOUR_MS
  if (diffHour < 2) return styles.syncRelativeFresh
  if (diffHour < 3) return styles.syncRelativeStale
  return styles.syncRelativeExpired
}

export const ScheduleSyncBadge = ({ isLoading, lastUpdatedMs, cooldown, onRetry, sidePadding }: Props) => {
  // 相対表記は1分ごとに描き直す。取得中と未取得の間は表示自体が無いので時計を止める
  const nowMs = useQuantizedClock(!isLoading && lastUpdatedMs !== null)
  const isRetryDisabled = isLoading || cooldown > 0

  return (
    <>
      <div className={styles.syncBadge} style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
        <span className={`icon-msr-filled ${styles.syncBadgeIcon}`} aria-hidden='true'>
          {isLoading ? 'sync' : 'verified'}
        </span>
        <span>{isLoading ? '最新スケジュールを取得中' : '最新スケジュールを反映済み'}</span>
        {!isLoading && lastUpdatedMs !== null && (
          <span className={styles.syncTime}>
            {jstClockLabel(lastUpdatedMs)}
            <span className={`${styles.syncRelative} ${relativeToneClass(lastUpdatedMs, nowMs)}`}>
              ({relativeLabel(lastUpdatedMs, nowMs)})
            </span>
            更新済み
          </span>
        )}
        <button
          type='button'
          className={styles.syncRetry}
          disabled={isRetryDisabled}
          aria-label={
            isLoading
              ? 'スケジュール再取得中'
              : cooldown > 0
                ? `スケジュールを再取得 (${cooldown}秒後に再取得可能)`
                : 'スケジュールを再取得'
          }
          onClick={() => {
            triggerHaptic('light')
            onRetry()
          }}
        >
          <span className={`icon-msr-filled ${styles.syncRetryIcon}`} aria-hidden='true'>
            refresh
          </span>
          {!isLoading && cooldown > 0 && <span className={styles.syncCooldown}>{cooldown}s</span>}
        </button>
      </div>
      {/* 同期バッジの直下1行で、予定データの出所が Garoon であることをさりげなく示す。
          左右の余白はバッジ本体と同じ sidePadding に揃える */}
      <GaroonSyncNote
        className={styles.syncNote}
        style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}
      />
    </>
  )
}
