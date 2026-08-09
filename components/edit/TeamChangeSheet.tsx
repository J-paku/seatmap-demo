// 07-admin-edit: チーム変更シート(下端シート・移動先Team一覧をチームカラードット+チーム名で表示)
import { useEffect, useRef } from 'react'
import type { TeamColorEntry } from '@/utils/team-colors'
import type { Team } from '@/types'
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss'
import e from './admin-edit.module.css'

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
    <div className={e.editDialogBackdrop} onClick={onClose}>
      <div
        ref={sheetRef}
        className={e.editSheet}
        role='dialog'
        aria-modal='true'
        aria-label='チーム変更'
        onClick={(e) => e.stopPropagation()}
        {...bind}
      >
        <h3 className={e.editSheetTitle}>チーム変更</h3>
        <div ref={listRef} className={e.editTeamList}>
          {teams.map((team) => {
            const entry = colorOf(team.id, team.name)
            return (
              <button
                key={team.id}
                type='button'
                className={`${e.editTeamRow}${team.id === currentTeamId ? ` ${e.isCurrent}` : ''}`}
                onClick={() => onSelect(team.id)}
                disabled={team.id === currentTeamId}
              >
                <span className={e.editTeamDot} style={{ background: entry.background }} />
                <span className='edit-team-name'>{team.name}</span>
              </button>
            )
          })}
        </div>
        <button type='button' className={`pixel-btn ${e.editSheetClose}`} onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  )
}
