// ガイド起動ボタン(？)。基準実物は EmployeeDirectory の「ディレクトリガイド」。
// 3箇所以上で同じ見た目が必要になったため共通化(AppHeader / SeatLayoutHeader / EmployeeDirectory)
import { triggerHaptic } from '@/utils/haptic'

type Props = {
  ariaLabel: string
  onClick: () => void
  // 呼び出し側の周辺レイアウト(余白等)を足すための通路
  className?: string
}

// 基準実物(EmployeeDirectory)に合わせた36px(h-9 w-9)。タップ表点推奨の44pxを下回るが、
// ガイドボタン形状統一というユーザーの明示指示を優先した結果
export const GuideButton = ({ ariaLabel, onClick, className }: Props) => (
  <button
    type='button'
    aria-label={ariaLabel}
    onClick={() => {
      triggerHaptic('light')
      onClick()
    }}
    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]${className ? ` ${className}` : ''}`}
    style={{
      background: 'var(--color-surface-elevated)',
      borderColor: 'var(--color-border)',
      boxShadow: 'var(--shadow-modal)',
      color: 'var(--color-text-primary)',
    }}
  >
    <span className='icon-msr-filled text-base leading-none' aria-hidden='true'>
      help_outline
    </span>
  </button>
)
