// 社員ディレクトリのスライドインパネルを提供するメインコンポーネント
import { useMemo, useState, useCallback } from 'react'
import { isDarkTheme } from '@/types'
import type { ThemeMode, Employee, Seat } from '@/types'
import { triggerHaptic } from '@/lib/haptic'
import { createVirtualSeat } from '@/lib/seat/seat-utils'
import { useScrollChainGuard } from '@/hooks/use-scroll-chain-guard'
import { FocusTrap } from '@/components/a11y/components/FocusTrap'
import { SheetDragHandle } from '@/components/SheetDragHandle'
import { AvatarCustomizerModal } from '@/components/AvatarCustomizerModal'
import { useEmployeeDirectory } from './hooks/use-employee-directory'
import { useEmployeeDirectoryView } from './hooks/use-employee-directory-view'
import { DepartmentTree } from './components/DepartmentTree'
import { DirectorySearchInput } from './components/DirectorySearchInput'
import { GaroonFooter } from './components/GaroonFooter'
import { SettingsPanel } from './components/SettingsPanel'

interface EmployeeDirectoryProps {
  isOpen: boolean
  onClose: () => void
  employees: Employee[]
  seats: Seat[]
  currentUserId?: string
  onSeatSelect: (seat: Seat) => void
  isGaroonConnected?: boolean
  onGaroonLogout?: () => void
  onRefresh?: () => void
  setTheme: (mode: ThemeMode) => void
  themeMode: ThemeMode
  // デモ固有: 実物のヘッダーに無い機能を設定パネルへ移設するための入口(§5.4)
  onEnterEdit?: () => void
  onResetLayout?: () => void
}

export function EmployeeDirectory({
  isOpen,
  onClose,
  employees,
  seats,
  currentUserId,
  onSeatSelect,
  isGaroonConnected,
  onGaroonLogout,
  onRefresh,
  setTheme,
  themeMode,
  onEnterEdit,
  onResetLayout,
}: EmployeeDirectoryProps) {
  // スクロール領域の端での親伝播を遮断（非スクロール領域用）
  const searchGuard = useScrollChainGuard()
  const footerGuard = useScrollChainGuard()

  const activeThemeMode = themeMode
  const activeSetTheme = setTheme
  const isDark = isDarkTheme(themeMode)

  const { isVisible, sidebarView, setSidebarView, sheetHandlers, dragStyle, isDragging } =
    useEmployeeDirectoryView(isOpen, onClose)

  // §4: ガイドツアーは移植しない。ヘルプボタンは外形だけ残して no-op にする
  const onHelp = () => {}

  // アバターカスタマイザモーダルの開閉状態
  const [isAvatarCustomizerOpen, setIsAvatarCustomizerOpen] = useState(false)
  const handleOpenAvatarCustomizer = useCallback(() => {
    setIsAvatarCustomizerOpen(true)
  }, [])
  const handleCloseAvatarCustomizer = useCallback(() => {
    setIsAvatarCustomizerOpen(false)
  }, [])

  const {
    searchQuery,
    setSearchQuery,
    filteredTree,
    pinnedGroup,
    isPinnedExpanded,
    togglePinned,
    expandedDepts,
    toggleDept,
    handleEmployeeTap,
    favoriteIds,
    favoriteDeptNames,
    isFavoritesExpanded,
    favoritesContent,
    toggleFavorite,
    toggleFavoriteDept,
    toggleFavoritesExpanded,
  } = useEmployeeDirectory(employees, seats, currentUserId)

  // フッター表示用に自分の社員情報を取得
  const currentUser = useMemo(
    () => (currentUserId ? employees.find(employee => employee.id === currentUserId) : undefined),
    [employees, currentUserId]
  )

  // 閉じるアニメーション中は表示を維持し、完了後にアンマウント
  if (!isVisible && !isOpen) return null

  return (
    // z はデモの尺度(styles/tokens.css)。移植元の Z_MODAL=50 だと他レイヤーとの上下が壊れる
    <div className='fixed inset-0' style={{ zIndex: 'var(--z-index-sidebar)' }}>
      {/* isOpen に応じて opacity トランジションを適用するオーバーレイ */}
      <div
        className='absolute inset-0 bg-black/30 transition-opacity duration-200'
        style={{ opacity: isOpen ? 1 : 0 }}
        onClick={() => {
          triggerHaptic('light')
          onClose()
        }}
        aria-hidden='true'
      />

      <FocusTrap isActive={isOpen}>
        <aside
          role='dialog'
          aria-modal='true'
          aria-label='社員ディレクトリ'
          // モバイル: 下端固定のボトムシート(上下開閉) / md以上: 右端固定のサイドバー(左右開閉)
          className={`absolute inset-x-0 bottom-0 flex h-[95dvh] max-h-[95dvh] min-h-0 w-full flex-col overflow-hidden md:inset-y-0 md:right-0 md:left-auto md:h-auto md:max-h-none md:w-80 md:border-l ${
            isOpen
              ? 'translate-y-0 md:translate-x-0'
              : 'translate-y-full md:translate-y-0 md:translate-x-full'
          }`}
          style={{
            // ドラッグ中は指に追従、それ以外は開閉アニメーション — 軸方向は className(レスポンシブ)で切替
            transform: dragStyle.transform,
            transition: isDragging
              ? 'none'
              : isOpen
                ? 'transform 300ms ease-out'
                : 'transform 200ms ease-in',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border)',
          }}
          {...sheetHandlers}
        >
          {/* モバイル: シート全域を下スワイプ／フリックで閉じる（ハンドルバーは視覚のみ・md以上はサイドバーのため非表示） */}
          <SheetDragHandle
            variant='inline'
            hiddenFrom='md'
            heightPx={28}
            onTap={onClose}
            compactTap
          />

          {/* ディレクトリビュー */}
          {sidebarView === 'directory' && (
            <>
              {/* 検索 + ヘルプ/閉じるを1行に集約（旧ヘッダー行を廃止しツリー表示領域を拡張） */}
              <div
                {...searchGuard.scrollContainerProps}
                className='flex shrink-0 items-center pr-2'
              >
                <div className='min-w-0 flex-1' data-coach='directory-search'>
                  <DirectorySearchInput
                    query={searchQuery}
                    onQueryChange={setSearchQuery}
                    isDark={isDark}
                  />
                </div>
                {/* ヘルプボタン — ? アイコンでガイドツアー再生 */}
                <button
                  type='button'
                  onClick={() => {
                    triggerHaptic('light')
                    onHelp()
                  }}
                  aria-label='ディレクトリガイド'
                  className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]'
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
                {/* モバイルはドラッグハンドルで閉じるため閉じるボタンは md 以上のみ表示 */}
                <button
                  type='button'
                  onClick={() => {
                    triggerHaptic('light')
                    onClose()
                  }}
                  className='hidden h-9 w-9 items-center justify-center rounded-lg md:flex'
                  aria-label='閉じる'
                >
                  <span className='icon-msr-filled text-[22px] leading-none' aria-hidden='true'>
                    close
                  </span>
                </button>
              </div>

              <div className='flex min-h-0 flex-1 flex-col' data-coach='directory-tree'>
                <DepartmentTree
                  tree={filteredTree}
                  pinnedGroup={pinnedGroup}
                  isPinnedExpanded={isPinnedExpanded}
                  onTogglePinned={togglePinned}
                  expandedDepts={expandedDepts}
                  onToggleDept={toggleDept}
                  currentUserId={currentUserId}
                  onEmployeeTap={employee => {
                    // 触覚は葉のEmployeeCardボタンで発火済み（ここで再発火すると二重になる）
                    const result = handleEmployeeTap(employee)
                    if (result) {
                      // 座席が見つかった場合はその座席で DetailPanel を表示
                      onSeatSelect(result.seat)
                    } else {
                      // 座席未割当: 仮想 Seat を生成して DetailPanel に社員情報のみ表示
                      onSeatSelect(createVirtualSeat(employee))
                    }
                  }}
                  favoriteIds={favoriteIds}
                  favoriteDeptNames={favoriteDeptNames}
                  isFavoritesExpanded={isFavoritesExpanded}
                  favoritesContent={favoritesContent}
                  onToggleFavorite={toggleFavorite}
                  onToggleFavoriteDept={toggleFavoriteDept}
                  onToggleFavoritesExpanded={toggleFavoritesExpanded}
                />
              </div>
            </>
          )}

          {/* 設定パネルビュー */}
          {sidebarView === 'settings' && (
            <SettingsPanel
              onEnterEdit={onEnterEdit}
              onResetLayout={onResetLayout}
              onBack={() => setSidebarView('directory')}
              onRefresh={onRefresh ?? (() => {})}
              setTheme={activeSetTheme}
              themeMode={activeThemeMode}
              isGaroonConnected={isGaroonConnected}
              onGaroonLogout={onGaroonLogout}
              onOpenAvatarCustomizer={handleOpenAvatarCustomizer}
              isDark={isDark}
            />
          )}

          <div
            {...footerGuard.scrollContainerProps}
            className='shrink-0'
            data-coach='directory-footer'
          >
            <GaroonFooter
              onSettingsClick={() =>
                setSidebarView(sidebarView === 'directory' ? 'settings' : 'directory')
              }
              isDark={isDark}
              displayName={currentUser?.name}
              onAvatarClick={handleOpenAvatarCustomizer}
            />
          </div>
        </aside>
      </FocusTrap>

      {/* ディレクトリガイドコーチマーク — aside の transform/overflow-hidden に閉じ込められると見切れるため、ルート直下(最上位)に配置 */}

      {/* アバターカスタマイザモーダル — 設定パネルから起動 */}
      <AvatarCustomizerModal
        isOpen={isAvatarCustomizerOpen}
        onClose={handleCloseAvatarCustomizer}
      />
    </div>
  )
}

export default function _Page() {
  return null
}
