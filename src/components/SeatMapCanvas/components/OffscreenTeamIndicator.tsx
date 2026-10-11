// オフスクリーンチームエッジインジケーター(最近傍チームへ移動ボタン)
import type { ReactNode } from 'react'
import type { Team } from '@/types'
import type { TeamColorEntry } from '@/utils/team-colors'
import type { OffscreenPingPos } from '../hooks/use-offscreen-team-indicator'
import styles from '../offscreen-team-indicator.module.css'

type Props = {
  team: Team
  colorEntry: TeamColorEntry
  pingPos: OffscreenPingPos
  onGo: () => void
}

// エッジ別の配置クラス。動的クラス名の文字列組み立ては禁止(docs/styling.md)
const EDGE_CLASS: Record<OffscreenPingPos['edge'], string> = {
  top: styles.edgeTop,
  bottom: styles.edgeBottom,
  left: styles.edgeLeft,
  right: styles.edgeRight,
}

// エッジ別の矢印パス(20x20 viewBox)
const ARROW_PATH: Record<OffscreenPingPos['edge'], ReactNode> = {
  right: (
    <>
      <path d='M4 10h12' />
      <path d='M12 5l5 5-5 5' />
    </>
  ),
  left: (
    <>
      <path d='M16 10H4' />
      <path d='M8 5l-5 5 5 5' />
    </>
  ),
  top: (
    <>
      <path d='M10 16V4' />
      <path d='M5 8l5-5 5 5' />
    </>
  ),
  bottom: (
    <>
      <path d='M10 4v12' />
      <path d='M5 12l5 5 5-5' />
    </>
  ),
}

export const OffscreenTeamIndicator = ({ team, colorEntry, pingPos, onGo }: Props) => {
  const isVertical = pingPos.edge === 'top' || pingPos.edge === 'bottom'
  // left/top エッジでは矢印セルをラベルより先に置く
  const arrowFirst = pingPos.edge === 'left' || pingPos.edge === 'top'
  const offset = isVertical ? { left: pingPos.x } : { top: pingPos.y }

  const arrow = (
    <span className={styles.arrowCell} style={{ background: colorEntry.foreground }}>
      <svg
        width='20'
        height='20'
        viewBox='0 0 20 20'
        fill='none'
        stroke={colorEntry.background}
        strokeWidth='2.5'
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
      >
        {ARROW_PATH[pingPos.edge]}
      </svg>
    </span>
  )

  return (
    <button
      type='button'
      onClick={onGo}
      aria-label={`チーム ${team.name} へ移動`}
      className={`${styles.indicator} ${EDGE_CLASS[pingPos.edge]}`}
      style={offset}
    >
      <span className={`${styles.body}${isVertical ? ` ${styles.isVertical}` : ''}`}>
        {arrowFirst && arrow}
        <span
          className={styles.labelCell}
          style={{ background: colorEntry.background, color: colorEntry.foreground }}
        >
          {team.name}
        </span>
        {!arrowFirst && arrow}
      </span>
    </button>
  )
}
