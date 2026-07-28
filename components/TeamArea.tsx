import { useMemo, useState } from 'react'
import { hexToRgba } from '@/lib/color'
import type { TeamColorEntry } from '@/lib/team-colors'
import type { Team } from '@/lib/types'

// チームエリア(背景+上部/左辺カラーバー+ラベルカード)。overview では在席数を表示
type Props = {
  team: Team
  area: { x: number; y: number; w: number; h: number }
  colorEntry: TeamColorEntry
  presentCount: number
  counterScale: number
  selected: boolean
  dimmed: boolean
  onSelect: (teamId: string) => void
  // 07: 編集モード中のみ付与。ラベルのドラッグでarea移動・タップでレイアウトモーダルを開く
  isEditMode?: boolean
  onLabelEditPointerDown?: (teamId: string, e: React.PointerEvent) => void
  onLabelTap?: (teamId: string) => void
}

// エリア幅に応じた文字サイズ段階(狭いほど縮小)
const labelFontSize = (width: number) => {
  if (width < 220) return 11
  if (width < 320) return 12
  return 13
}

export const TeamArea = ({
  team,
  area,
  colorEntry,
  presentCount,
  counterScale,
  selected,
  dimmed,
  onSelect,
  isEditMode,
  onLabelEditPointerDown,
  onLabelTap,
}: Props) => {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  // 選択時0.25・通常0.15・非選択時ダウントーン
  const opacity = selected ? 0.25 : dimmed ? 0.08 : 0.15
  const background = useMemo(
    () => hexToRgba(colorEntry.background, opacity),
    [colorEntry.background, opacity]
  )

  const scale = pressed ? 0.97 : hovered && !dimmed ? 1.02 : 1

  return (
    <div
      className={`team-area${selected ? ' is-selected' : ''}${dimmed ? ' is-dimmed' : ''}`}
      role='button'
      tabIndex={-1}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(team.id)
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false)
        setPressed(false)
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      style={{
        left: area.x,
        top: area.y,
        width: area.w,
        height: area.h,
        background,
        borderColor: selected ? colorEntry.border : hexToRgba(colorEntry.border, 0.5),
        transform: `scale(${scale})`,
      }}
    >
      <div className='team-area-bar' style={{ background: colorEntry.background }} />
      <div className='team-area-side-bar' style={{ background: colorEntry.background }} />
      <div
        className={`team-area-label${isEditMode ? ' is-edit-mode' : ''}`}
        style={{ fontSize: labelFontSize(area.w) * counterScale }}
        onPointerDown={
          isEditMode
            ? (e) => {
                e.stopPropagation()
                onLabelEditPointerDown?.(team.id, e)
              }
            : undefined
        }
        onClick={
          isEditMode
            ? (e) => {
                e.stopPropagation()
                onLabelTap?.(team.id)
              }
            : undefined
        }
      >
        <span className='team-area-label-strip' style={{ background: colorEntry.background }} />
        <span className='team-area-label-name'>{team.name}</span>
        <span
          className='team-area-label-badge'
          style={{ background: colorEntry.background, color: colorEntry.foreground }}
        >
          {presentCount}名
        </span>
      </div>
    </div>
  )
}
