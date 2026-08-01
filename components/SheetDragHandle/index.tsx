// ボトムシート上端のハンドルバー（バータップで閉じる・ドラッグはシートルートへ spread した sheetHandlers が担当）
import { triggerHaptic } from '@/lib/haptic'

interface SheetDragHandleProps {
  heightPx?: number
  // シートが中央/サイドレイアウトへ切り替わるブレークポイント（以降はハンドル非表示）
  hiddenFrom?: 'sm' | 'md'
  // overlay=上端に絶対配置(既定) / inline=通常フローに置きコンテンツを押し下げる
  variant?: 'overlay' | 'inline'
  // ハンドルバータップで閉じるコールバック（未指定時は視覚のみ）
  onTap?: () => void
  // true: タップ領域を strip 高さに合わせ縮める（低い heightPx で min-h-11 が溢れるのを防ぐ）
  compactTap?: boolean
}

// Tailwind JIT がクラスを検出できるようリテラルで列挙する
const HIDDEN_CLASS = { sm: 'sm:hidden', md: 'md:hidden' }

export function SheetDragHandle({
  heightPx = 96,
  hiddenFrom = 'sm',
  variant = 'overlay',
  onTap,
  compactTap = false,
}: SheetDragHandleProps) {
  // overlay はストリップ自体を素通しにし、バーのボタンのみタップを受ける（シートルートがドラッグを受ける）
  const positionClass =
    variant === 'overlay'
      ? 'pointer-events-none absolute inset-x-0 top-0 z-20'
      : 'relative shrink-0'
  return (
    <div
      className={`${positionClass} flex w-full flex-col items-center ${HIDDEN_CLASS[hiddenFrom]}`}
      style={{ height: heightPx }}
    >
      {onTap ? (
        <button
          type='button'
          aria-label='シートを閉じる'
          onClick={() => {
            triggerHaptic('light')
            onTap()
          }}
          data-drag-handle='true'
          className={`pointer-events-auto touch-none flex ${
            compactTap ? 'h-full min-h-0' : 'min-h-11'
          } min-w-20 cursor-grab items-start justify-center pt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
        >
          <span
            className='block h-1.5 w-10 rounded-full'
            style={{ backgroundColor: 'var(--color-border-strong)' }}
          />
        </button>
      ) : (
        <span
          className='mt-2 block h-1.5 w-10 rounded-full'
          style={{ backgroundColor: 'var(--color-border-strong)' }}
        />
      )}
    </div>
  )
}
