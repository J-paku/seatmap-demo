import { useMemo, useRef, useState } from 'react'
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
  // 10: 閲覧モードの pointerup(タップ)で画面座標 rect を渡してオーバーレイを開く
  onBoundaryOpen: (teamId: string, rect: DOMRect) => void
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

// タップ確定/ロングプレスの閾値(10-main-interactions 実測)
const TAP_DISTANCE_THRESHOLD = 8
const OBJECT_LONG_PRESS_MS = 300

export const TeamArea = ({
  team,
  area,
  colorEntry,
  presentCount,
  counterScale,
  selected,
  dimmed,
  onBoundaryOpen,
  isEditMode,
  onLabelEditPointerDown,
  onLabelTap,
}: Props) => {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  // ポインタ状態機械用の ref(再レンダーを起こさない)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const movedRef = useRef(false)
  const lpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lpFiredRef = useRef(false)

  const clearLongPress = () => {
    if (lpTimerRef.current) {
      clearTimeout(lpTimerRef.current)
      lpTimerRef.current = null
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    setPressed(true)
    if (isEditMode) return
    if (!e.isPrimary) return
    startRef.current = { x: e.clientX, y: e.clientY }
    movedRef.current = false
    lpFiredRef.current = false
    clearLongPress()
    lpTimerRef.current = setTimeout(() => {
      lpTimerRef.current = null
      // ロングプレス発火(編集進入は07担当・ここでは以降のタップを抑止するだけ)
      lpFiredRef.current = true
    }, OBJECT_LONG_PRESS_MS)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isEditMode || !startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (Math.hypot(dx, dy) > TAP_DISTANCE_THRESHOLD) {
      movedRef.current = true
      clearLongPress()
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setPressed(false)
    clearLongPress()
    if (isEditMode) return
    // ロングプレス発火済み・パン(8px超)・非プライマリはタップ扱いしない
    if (lpFiredRef.current || movedRef.current || !startRef.current) {
      startRef.current = null
      return
    }
    startRef.current = null
    const rect = e.currentTarget.getBoundingClientRect()
    onBoundaryOpen(team.id, rect)
  }

  const handlePointerLeave = () => {
    setHovered(false)
    setPressed(false)
    clearLongPress()
    startRef.current = null
  }

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
      // 閲覧モードの開きは pointerup。合成 click はキャンバス背景へバブリングさせない
      onClick={(e) => e.stopPropagation()}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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
