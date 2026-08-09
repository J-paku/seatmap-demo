// サイドバー設定パネル: スケジュール更新・テーマ選択・ログアウト
import { useState, useCallback } from 'react'
import { ThemeSelector } from './ThemeSelector'
import { GaroonLogoutBar } from './GaroonLogoutBar'
import type { ThemeMode } from '@/types'
import { triggerHaptic } from '@/lib/haptic'
import { useLayoutSource } from '@/contexts/layout-source-context'
import { floorNameOf, DEFAULT_FLOOR_ID } from '@/utils/floors'

interface SettingsPanelProps {
  onBack: () => void
  onRefresh: () => void
  setTheme: (mode: ThemeMode) => void
  themeMode: ThemeMode
  isGaroonConnected?: boolean
  onGaroonLogout?: () => void
  onOpenAvatarCustomizer: () => void
  // 編集への入口は左下 FAB へ移したので、ここでは受け取っても行を出さない
  onEnterEdit?: () => void
  // デモ固有: 実物には無いレイアウト初期化をここへ移設した(§5.4)
  onResetLayout?: () => void
}

export function SettingsPanel({
  onBack,
  onRefresh,
  setTheme,
  themeMode,
  isGaroonConnected,
  onGaroonLogout,
  onOpenAvatarCustomizer,
  onResetLayout,
}: SettingsPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { source } = useLayoutSource()
  const isViewingCustomLayout = source.type === 'custom'
  // リセット行のラベルに出す対象フロア名。公式表示中は表示中フロア、カスタム表示中は
  // (リセット自体が無効化されるため)既定フロア名を出す
  const resetFloorName = source.type === 'official' ? floorNameOf(source.floorId) : floorNameOf(DEFAULT_FLOOR_ID)

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
          borderBottom: `1px solid var(--color-border)`,
          backgroundColor: 'var(--color-surface-elevated)',
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
          style={{ minWidth: 44, minHeight: 44, color: 'var(--color-text-primary)' }}
        >
          <span className='icon-msr-filled text-xl' aria-hidden='true'>
            arrow_back
          </span>
        </button>
        <span
          className='flex-1 text-center text-base font-semibold'
          style={{ color: 'var(--color-text-primary)' }}
        >
          設定
        </span>
        <div className='w-11' />
      </div>

      {/* コンテンツ */}
      <div
        className='flex-1 overflow-y-auto overscroll-contain touch-pan-y'
        style={{ backgroundColor: 'var(--color-surface-elevated)' }}
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

        {/* デモ固有の行: 表示中の公式フロアの初期化(確認ダイアログは呼び出し側が持つ)。
            カスタムレイアウト表示中は表示中フロアを触っていないため無効化する */}
        {onResetLayout && (
          <button
            type='button'
            onClick={() => {
              triggerHaptic('light')
              onResetLayout()
            }}
            disabled={isViewingCustomLayout}
            className='flex w-full items-center gap-3 px-4 py-4 transition-colors'
            style={{
              color: 'var(--color-text-primary)',
              borderBottom: '1px solid var(--color-border)',
              opacity: isViewingCustomLayout ? 0.4 : 1,
              cursor: isViewingCustomLayout ? 'not-allowed' : 'pointer',
            }}
          >
            <span
              className='icon-msr-filled text-lg'
              aria-hidden='true'
              style={{ color: 'var(--color-accent)' }}
            >
              restart_alt
            </span>
            <span className='text-sm'>{`${resetFloorName}を初期化`}</span>
          </button>
        )}

        {/* スケジュール更新 */}
        <button
          type='button'
          onClick={handleRefresh}
          disabled={isRefreshing}
          className='flex w-full items-center gap-3 px-4 py-4 transition-colors'
          style={{
            color: 'var(--color-text-primary)',
            borderBottom: `1px solid var(--color-border)`,
          }}
        >
          <span
            className={['icon-msr-filled text-lg', isRefreshing ? 'animate-spin' : ''].join(' ')}
            aria-hidden='true'
            style={{ color: 'var(--color-text-muted)' }}
          >
            sync
          </span>
          <span className='text-sm'>スケジュール更新</span>
        </button>

        {/* テーマ */}
        <ThemeSelector themeMode={themeMode} setTheme={setTheme} />
      </div>

      {/* パネル右下: Garoonログアウト導線 */}
      <GaroonLogoutBar
        isGaroonConnected={isGaroonConnected}
        onGaroonLogout={onGaroonLogout}
      />
    </div>
  )
}
