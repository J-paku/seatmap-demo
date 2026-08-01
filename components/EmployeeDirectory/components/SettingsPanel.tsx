// サイドバー設定パネル: スケジュール更新・テーマ選択・ログアウト
import { useState, useCallback } from 'react'
import { ThemeSelector } from './ThemeSelector'
import { GaroonLogoutBar } from './GaroonLogoutBar'
import type { ThemeMode } from '@/types'
import { triggerHaptic } from '@/lib/haptic'

interface SettingsPanelProps {
  onBack: () => void
  onRefresh: () => void
  setTheme: (mode: ThemeMode) => void
  themeMode: ThemeMode
  isGaroonConnected?: boolean
  onGaroonLogout?: () => void
  onOpenAvatarCustomizer: () => void
  // デモ固有: 実物のヘッダーには無い機能をここへ移設した(§5.4)
  onEnterEdit?: () => void
  onResetLayout?: () => void
  isDark: boolean
}

export function SettingsPanel({
  onBack,
  onRefresh,
  setTheme,
  themeMode,
  isGaroonConnected,
  onGaroonLogout,
  onOpenAvatarCustomizer,
  onEnterEdit,
  onResetLayout,
  isDark,
}: SettingsPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(() => {
    triggerHaptic('medium')
    onRefresh()
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1500)
  }, [onRefresh])

  const handleOpenAvatarCustomizer = useCallback(() => {
    triggerHaptic('light')
    onOpenAvatarCustomizer()
  }, [onOpenAvatarCustomizer])

  return (
    <div className='flex flex-col flex-1 min-h-0'>
      {/* ヘッダー */}
      <div
        className='flex h-14 shrink-0 items-center px-3'
        style={{
          borderBottom: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
          backgroundColor: isDark ? '#1F2230' : '#FFFFFF',
        }}
      >
        <button
          type='button'
          aria-label='社員一覧に戻る'
          onClick={() => {
            triggerHaptic('light')
            onBack()
          }}
          className='flex items-center justify-center w-11 h-11 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
          style={{ minWidth: 44, minHeight: 44, color: isDark ? '#F8F8F2' : '#1A1A1A' }}
        >
          <span className='icon-msr-filled text-xl' aria-hidden='true'>
            arrow_back
          </span>
        </button>
        <span
          className='flex-1 text-center text-base font-semibold'
          style={{ color: isDark ? '#F8F8F2' : '#1A1A1A' }}
        >
          設定
        </span>
        <div className='w-11' />
      </div>

      {/* コンテンツ */}
      <div
        className='flex-1 overflow-y-auto overscroll-contain touch-pan-y'
        style={{ backgroundColor: isDark ? '#1F2230' : '#FFFFFF' }}
      >
        {/* アバター編集 */}
        <button
          type='button'
          onClick={handleOpenAvatarCustomizer}
          className='flex w-full items-center gap-3 px-4 py-4 transition-colors'
          style={{
            color: 'var(--color-text-primary)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span
            className='icon-msr-filled text-lg'
            aria-hidden='true'
            style={{ color: 'var(--color-accent)' }}
          >
            face
          </span>
          <span className='text-sm'>アバター編集</span>
        </button>

        {/* デモ固有の行: 実物のヘッダーに無いレイアウト編集機能をここへ移設した(§5.4) */}
        {onEnterEdit && (
          <button
            type='button'
            onClick={() => {
              triggerHaptic('light')
              onEnterEdit()
            }}
            className='flex w-full items-center gap-3 px-4 py-4 transition-colors'
            style={{
              color: 'var(--color-text-primary)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span
              className='icon-msr-filled text-lg'
              aria-hidden='true'
              style={{ color: 'var(--color-accent)' }}
            >
              edit
            </span>
            <span className='text-sm'>レイアウト編集</span>
          </button>
        )}

        {/* デモ固有の行: レイアウトのリセット(確認ダイアログは呼び出し側が持つ) */}
        {onResetLayout && (
          <button
            type='button'
            onClick={() => {
              triggerHaptic('light')
              onResetLayout()
            }}
            className='flex w-full items-center gap-3 px-4 py-4 transition-colors'
            style={{
              color: 'var(--color-text-primary)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span
              className='icon-msr-filled text-lg'
              aria-hidden='true'
              style={{ color: 'var(--color-accent)' }}
            >
              restart_alt
            </span>
            <span className='text-sm'>レイアウトをリセット</span>
          </button>
        )}

        {/* スケジュール更新 */}
        <button
          type='button'
          onClick={handleRefresh}
          disabled={isRefreshing}
          className='flex w-full items-center gap-3 px-4 py-4 transition-colors'
          style={{
            color: isDark ? '#F8F8F2' : '#1A1A1A',
            borderBottom: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
          }}
        >
          <span
            className={['icon-msr-filled text-lg', isRefreshing ? 'animate-spin' : ''].join(' ')}
            aria-hidden='true'
            style={{ color: isDark ? '#B8C0DD' : '#6B7280' }}
          >
            sync
          </span>
          <span className='text-sm'>スケジュール更新</span>
        </button>

        {/* テーマ */}
        <ThemeSelector themeMode={themeMode} setTheme={setTheme} isDark={isDark} />
      </div>

      {/* パネル右下: Garoonログアウト導線 */}
      <GaroonLogoutBar
        isGaroonConnected={isGaroonConnected}
        onGaroonLogout={onGaroonLogout}
        isDark={isDark}
      />
    </div>
  )
}
