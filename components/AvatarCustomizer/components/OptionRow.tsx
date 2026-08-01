// アバターパーツ選択行 — ラベル + 横スクロール可能なチップ群 + 必要時のみ表示される左右スクロールヒント
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { triggerHaptic } from '@/lib/haptic'
import { PartPreviewChip } from './PartPreviewChip'

interface OptionRowOption {
  id: string
  preview: ReactNode
  label?: string
}

interface OptionRowProps {
  label: string
  options: OptionRowOption[]
  selectedId: string
  onSelect: (id: string) => void
  showOptionLabels?: boolean
  // 見出しを視覚的に隠す (aria 用にラベル文字列は保持)
  hideLabel?: boolean
}

const ROW_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  rowGap: 6,
  width: '100%',
  minWidth: 0,
}

const LABEL_STYLE: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}

// スクロールヒントを重ねるための relative ラッパ
const TRACK_STYLE: CSSProperties = {
  position: 'relative',
  width: '100%',
  minWidth: 0,
}

const SCROLL_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'nowrap',
  gap: 8,
  overflowX: 'auto',
  overflowY: 'hidden',
  paddingBottom: 8,
  paddingTop: 2,
  paddingLeft: 2,
  paddingRight: 2,
  WebkitOverflowScrolling: 'touch',
  // 横スワイプはチップ送り・縦スワイプは親モーダルへ委譲 — pan-x単独だと縦スクロールがこの行上で塞がれ操作が引っかかる
  touchAction: 'pan-x pan-y',
  overscrollBehaviorX: 'contain',
  width: '100%',
  minWidth: 0,
  scrollBehavior: 'smooth',
}

const OPTION_LABEL_STYLE: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--color-text-secondary)',
  textAlign: 'center',
  maxWidth: 64,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const OPTION_CELL_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  flexShrink: 0,
}

// クリックでスクロールできる半透明グラデーション矢印ボタン
function ScrollHint({
  side,
  visible,
  onClick,
}: {
  side: 'left' | 'right'
  visible: boolean
  onClick: () => void
}) {
  const isLeft = side === 'left'
  return (
    <button
      type='button'
      aria-label={isLeft ? '左へスクロール' : '右へスクロール'}
      tabIndex={visible ? 0 : -1}
      onClick={() => {
        triggerHaptic('light')
        onClick()
      }}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 48,
        left: isLeft ? 0 : undefined,
        right: isLeft ? undefined : 0,
        background: `linear-gradient(to ${side}, transparent, var(--color-surface-overlay))`,
        pointerEvents: visible ? 'auto' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isLeft ? 'flex-start' : 'flex-end',
        paddingLeft: isLeft ? 4 : undefined,
        paddingRight: isLeft ? undefined : 4,
        zIndex: 2,
        transition: 'opacity 200ms ease',
        opacity: visible ? 1 : 0,
        cursor: 'pointer',
        border: 'none',
      }}
    >
      <span
        className='icon-msr-filled'
        style={{ fontSize: 18, color: 'var(--color-text-secondary)', opacity: 0.7 }}
      >
        {isLeft ? 'chevron_left' : 'chevron_right'}
      </span>
    </button>
  )
}

// チップ 2.5 枚分を 1 ステップとしてスクロール
const SCROLL_STEP = 160

export function OptionRow({
  label,
  options,
  selectedId,
  onSelect,
  showOptionLabels,
  hideLabel,
}: OptionRowProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [hasMoreLeft, setHasMoreLeft] = useState(false)
  const [hasMoreRight, setHasMoreRight] = useState(false)

  // scroll 量と要素サイズの変化に応じて左右ヒントの表示状態を更新
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      const hasOverflow = el.scrollWidth > el.clientWidth + 1
      const atStart = el.scrollLeft <= 1
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      setHasMoreLeft(hasOverflow && !atStart)
      setHasMoreRight(hasOverflow && !atEnd)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [options.length])

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' })
  }

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' })
  }

  return (
    <div style={ROW_STYLE}>
      {hideLabel ? null : <span style={LABEL_STYLE}>{label}</span>}
      <div style={TRACK_STYLE}>
        {/* 左右のスクロールヒント (クリックでスクロール) */}
        <ScrollHint side='left' visible={hasMoreLeft} onClick={scrollLeft} />
        <ScrollHint side='right' visible={hasMoreRight} onClick={scrollRight} />
        <div ref={scrollRef} style={SCROLL_STYLE}>
          {options.map(option => (
            <div key={option.id} style={OPTION_CELL_STYLE}>
              <PartPreviewChip
                isSelected={option.id === selectedId}
                ariaLabel={option.label ?? `${label} ${option.id}`}
                onClick={() => onSelect(option.id)}
              >
                {option.preview}
              </PartPreviewChip>
              {showOptionLabels && option.label ? (
                <span style={OPTION_LABEL_STYLE}>{option.label}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
