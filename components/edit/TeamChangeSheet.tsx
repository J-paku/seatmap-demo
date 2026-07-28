// 07-admin-edit: チーム変更シート(下端シート・移動先Team一覧をチームカラードット+チーム名で表示)
import { useEffect, useRef } from 'react'
import type { TeamColorEntry } from '@/lib/team-colors'
import type { Team } from '@/lib/types'
import { useSwipeDismiss } from '@/lib/use-swipe-dismiss'

type Props = {
  teams: Team[]
  currentTeamId: string
  colorOf: (teamId: string, teamName: string) => TeamColorEntry
  onSelect: (teamId: string) => void
  onClose: () => void
}

export const TeamChangeSheet = ({ teams, currentTeamId, colorOf, onSelect, onClose }: Props) => {
  const listRef = useRef<HTMLDivElement>(null)
  // 下スワイプで閉じる(リスト内スクロール中は開始しない)
  const { sheetRef, bind } = useSwipeDismiss({ onClose, scrollGateRef: listRef })

  // マウント時に必ずスクロール位置を先頭へ戻す
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [])

  return (
    <div className='edit-dialog-backdrop' onClick={onClose}>
      <div
        ref={sheetRef}
        className='edit-sheet'
        role='dialog'
        aria-modal='true'
        aria-label='チーム変更'
        onClick={(e) => e.stopPropagation()}
        {...bind}
      >
        <h3 className='edit-sheet-title'>チーム変更</h3>
        <div ref={listRef} className='edit-team-list'>
          {teams.map((team) => {
            const entry = colorOf(team.id, team.name)
            return (
              <button
                key={team.id}
                type='button'
                className={`edit-team-row${team.id === currentTeamId ? ' is-current' : ''}`}
                onClick={() => onSelect(team.id)}
                disabled={team.id === currentTeamId}
              >
                <span className='edit-team-dot' style={{ background: entry.background }} />
                <span className='edit-team-name'>{team.name}</span>
              </button>
            )
          })}
        </div>
        <button type='button' className='pixel-btn edit-sheet-close' onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  )
}
