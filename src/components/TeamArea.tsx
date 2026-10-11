import { useState } from 'react'
import { useLongPress } from '@/hooks/use-long-press'
import { hexToRgba } from '@/utils/color'
import { clamp } from '@/utils/layout/geometry'
import type { TeamColorEntry } from '@/utils/team-colors'
import type { Lod, Team } from '@/types'

// チームエリア(バウンダリ)。原本の5層構造: 床カード / 上バー / 左バー / インタラクション面 / ラベル板
type Props = {
  team: Team
  area: { x: number; y: number; w: number; h: number }
  colorEntry: TeamColorEntry
  presentCount: number
  lod: Lod
  dimmed: boolean
  onBoundaryOpen: (teamId: string, rect: DOMRect) => void
  isEditMode?: boolean
  onLabelEditPointerDown?: (teamId: string, e: React.PointerEvent) => void
  // 05-3: 編集セッション中のチーム枠タップ。移動ゴーストを開く(実体はその場に残る)
  onEditTap?: (teamId: string) => void
  // 05-1: 閲覧モードで管理者がチーム枠を長押しすると編集セッションへ入る。
  // 渡されない(=長押しの行き先が無い)ときは長押し判定そのものを持たない
  onLongPressEditSession?: () => void
}

const ISLAND_INSET = 4

export const TeamArea = ({
  team,
  area,
  colorEntry,
  presentCount,
  lod,
  dimmed,
  onBoundaryOpen,
  isEditMode,
  onLabelEditPointerDown,
  onEditTap,
  onLongPressEditSession,
}: Props) => {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  // 05-1: しきい値(500ms / 10px)は +FAB の長押しと同じフックを共有する。
  // 同じ「長押し」に2つ目の値を作らないため、ここには数値を書かない
  const longPress = useLongPress({
    onLongPress: () => {
      setPressed(false)
      onLongPressEditSession?.()
    },
  })
  const canLongPress = !isEditMode && onLongPressEditSession !== undefined

  // 開くのは click で行う(キャンバスが pointer capture を取るため pointerup はここへ来ない)。
  // ドラッグ後の合成 click はキャンバス側の onClickCapture が抑制する
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPressed(false)
    // 長押しの直後に来る click は、その押下の続きなので何もしない。
    // 判定を編集モードの分岐より前に置くのが要点 — 長押しでセッションへ入った瞬間に
    // 同じ押下の click が届くので、後ろに置くと入った途端に移動ゴーストまで開いてしまう
    if (longPress.consumeFired()) return
    // 05-3: セッション中は枠のどこを叩いても移動ゴースト。ラベル板の click もここへ上がってくる
    if (isEditMode) {
      onEditTap?.(team.id)
      return
    }
    onBoundaryOpen(team.id, e.currentTarget.getBoundingClientRect())
  }

  const inner = { x: area.x + ISLAND_INSET, y: area.y + ISLAND_INSET, w: area.w - ISLAND_INSET * 2, h: area.h - ISLAND_INSET * 2 }
  const dot = colorEntry.background
  const teamNameFont = clamp(Math.round(inner.w * 0.095), 44, 72)
  const countFont = clamp(Math.round(teamNameFont * 0.72), 30, 52)
  const topBarH = lod === 'overview' ? 8 : lod === 'mid' ? 6 : 4
  const topBarR = lod === 'overview' ? 4 : 2
  const leftBarW = lod === 'overview' ? 6 : 4
  const leftBarOpacity = lod === 'overview' ? 0.7 : 0.45
  const scale = pressed ? 0.97 : hovered && !dimmed ? 1.02 : 1

  return (
    <>
      {/* 床カード */}
      <div style={{ position: 'absolute', left: inner.x, top: inner.y, width: inner.w, height: inner.h, borderRadius: 16, background: 'var(--color-surface-elevated)', opacity: 0.95, pointerEvents: 'none' }} />
      {/* 上部カラーバー */}
      <div style={{ position: 'absolute', left: area.x + 10, top: area.y + 8, width: Math.max(0, area.w - 16), height: topBarH, borderRadius: topBarR, background: dot, opacity: 0.95, pointerEvents: 'none' }} />
      {/* 左辺カラーバー */}
      <div style={{ position: 'absolute', left: area.x + 8, top: area.y + 20, width: leftBarW, height: Math.max(0, area.h - 32), borderRadius: 2, background: dot, opacity: leftBarOpacity, pointerEvents: 'none' }} />
      {/* インタラクション面 */}
      <div
        role='button'
        tabIndex={-1}
        data-team-id={team.idPrefix}
        title={isEditMode ? `${team.name}をタップして移動` : `${team.name} - ${presentCount}名`}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => {
          setHovered(false)
          setPressed(false)
          if (canLongPress) longPress.handlers.onPointerLeave()
        }}
        onPointerDown={(e) => {
          if (!isEditMode) setPressed(true)
          if (canLongPress) longPress.handlers.onPointerDown(e)
        }}
        onPointerMove={(e) => {
          if (canLongPress) longPress.handlers.onPointerMove(e)
        }}
        onPointerUp={() => {
          if (canLongPress) longPress.handlers.onPointerUp()
        }}
        onPointerCancel={() => {
          setPressed(false)
          if (canLongPress) longPress.handlers.onPointerCancel()
        }}
        style={{
          position: 'absolute',
          left: inner.x,
          top: inner.y,
          width: inner.w,
          height: inner.h,
          borderRadius: 16,
          background: hexToRgba(dot, 0.15),
          border: `1px solid ${hexToRgba(dot, 0.5)}`,
          boxSizing: 'border-box',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          opacity: dimmed ? 0.5 : 1,
          transform: `scale(${scale})`,
          transition: 'transform .2s ease, background .2s ease, border-color .2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* ラベル板(ネオブルータル) */}
        <div
          onPointerDown={isEditMode ? (e) => { e.stopPropagation(); onLabelEditPointerDown?.(team.id, e) } : undefined}
          style={{
            display: 'grid',
            gridTemplateColumns: '14px 1fr auto',
            alignItems: 'stretch',
            borderRadius: 14,
            overflow: 'hidden',
            maxWidth: 'calc(100% - 20px)',
            border: '2px solid #111827',
            background: '#ffffff',
            boxShadow: '4px 4px 0 #111827',
          }}
        >
          <div style={{ background: dot }} />
          <div style={{ padding: '13px 18px', fontWeight: 800, lineHeight: 1.1, color: '#111827', fontSize: teamNameFont, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {team.name}
          </div>
          <div style={{ padding: '13px 18px', fontWeight: 900, color: '#ffffff', background: dot, fontSize: countFont, display: 'flex', alignItems: 'center' }}>
            {presentCount}名
          </div>
        </div>
      </div>
    </>
  )
}
