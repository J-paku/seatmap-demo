// テーマ選択 — 各テーマの背景色とアクセント色を対角に二分した円形スウォッチを1行に並べて選ぶ
import { useId } from 'react'
import { useThemeSelector } from './hooks/use-theme-selector'
import type { ThemeMode, ThemeOption } from '@/types'
import { triggerHaptic } from '@/lib/haptic'

interface ThemeSelectorProps {
  themeMode: ThemeMode
  setTheme: (mode: ThemeMode) => void
  isDark: boolean
}

// 45°対角で背景色(左上)とアクセント色(右下)を二分した円形スウォッチ
// 境界に1pxの光のハイライト、上部にソフトな光沢を載せて物性を出す
const ThemeSwatch = ({ option, size }: { option: ThemeOption; size: number }) => {
  const uid = useId()
  const clipId = `swatch-${uid}`
  const glossId = `gloss-${uid}`

  return (
    <svg viewBox='0 0 100 100' width={size} height={size} aria-hidden='true'>
      <defs>
        <clipPath id={clipId}>
          <circle cx='50' cy='50' r='50' />
        </clipPath>
        {/* 上部から下へ抜けるソフト光沢 */}
        <linearGradient id={glossId} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor='#FFFFFF' stopOpacity='0.28' />
          <stop offset='48%' stopColor='#FFFFFF' stopOpacity='0' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {/* 背景色の下地 */}
        <rect x='0' y='0' width='100' height='100' fill={option.swatchBg} />
        {/* アクセント色の右下三角 */}
        <path d='M100,0 L100,100 L0,100 Z' fill={option.swatchAccent} />
        {/* 対角境界の1pxハイライト */}
        <line
          x1='100'
          y1='0'
          x2='0'
          y2='100'
          stroke='#FFFFFF'
          strokeOpacity='0.5'
          strokeWidth='1.5'
        />
        {/* 上部のソフト光沢 */}
        <rect x='0' y='0' width='100' height='100' fill={`url(#${glossId})`} />
      </g>
      {/* 輪郭リング — 暗いテーマでも縁を保証する内側の細線 */}
      <circle
        cx='50'
        cy='50'
        r='49'
        fill='none'
        stroke='#000000'
        strokeOpacity='0.12'
        strokeWidth='1'
      />
    </svg>
  )
}

export function ThemeSelector({ themeMode, setTheme, isDark }: ThemeSelectorProps) {
  const { options, currentOption, isOpen, toggleOpen, handleSelect } = useThemeSelector({
    themeMode,
    setTheme,
  })

  return (
    <div
      style={{
        color: isDark ? '#F8F8F2' : '#1A1A1A',
        borderBottom: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
      }}
    >
      {/* トリガー行 — 左にラベル、右に現在テーマの塊 */}
      <button
        type='button'
        onClick={() => {
          triggerHaptic('light')
          toggleOpen()
        }}
        aria-expanded={isOpen}
        aria-label='テーマを選択'
        className='flex w-full items-center justify-between gap-3 px-4 py-4 transition-colors'
        style={{ minHeight: 44 }}
      >
        <div className='flex items-center gap-3'>
          <span
            className='icon-msr-thin text-xl'
            aria-hidden='true'
            style={{ color: isDark ? '#B8C0DD' : '#6B7280' }}
          >
            palette
          </span>
          <span className='text-sm'>テーマ</span>
        </div>
        <div className='flex items-center gap-2.5'>
          <span style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.12))' }}>
            <ThemeSwatch option={currentOption} size={12} />
          </span>
          <span
            className='icon-msr-thin text-xl transition-transform duration-200 ease-out motion-reduce:transition-none'
            aria-hidden='true'
            style={{
              color: isDark ? '#B8C0DD' : '#6B7280',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* 展開パネル — grid トリックで高さを滑らかに開閉 */}
      <div
        className='grid transition-all duration-200 ease-out motion-reduce:transition-none'
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', opacity: isOpen ? 1 : 0 }}
      >
        <div className='overflow-hidden'>
          <div
            role='radiogroup'
            aria-label='テーマ'
            className='flex items-start justify-around gap-1 px-3 pb-4 pt-2'
          >
            {options.map(option => {
              const isSelected = option.mode === themeMode
              return (
                <button
                  key={option.mode}
                  type='button'
                  role='radio'
                  aria-checked={isSelected}
                  aria-label={option.label}
                  onClick={() => {
                    triggerHaptic('light')
                    handleSelect(option.mode)
                  }}
                  className='flex flex-col items-center gap-2 rounded-2xl p-2 transition-all duration-200 ease-out motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                  style={{
                    transform: isSelected ? 'scale(1.05)' : 'scale(0.9)',
                    opacity: isSelected ? 1 : 0.55,
                    filter: isSelected
                      ? 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.2))'
                      : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
                  }}
                >
                  <ThemeSwatch option={option} size={24} />
                  {/* iOS 風の選択ドットインジケータ */}
                  <span
                    className='rounded-full transition-opacity duration-200 ease-out motion-reduce:transition-none'
                    style={{
                      width: 5,
                      height: 5,
                      background: 'var(--color-accent)',
                      opacity: isSelected ? 1 : 0,
                    }}
                  />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThemeSelector
