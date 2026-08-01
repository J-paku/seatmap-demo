// 部署ごとの社員ツリーを表示するコンポーネント
import { useScrollChainGuard } from '@/hooks/use-scroll-chain-guard'
import type { DepartmentTreeProps } from './types'
import { useDepartmentTree } from './hooks/use-department-tree'
import { SectionLabel } from './components/SectionLabel'
import { DepartmentGroupRow } from './components/DepartmentGroupRow'
import { FavoritesSection } from './components/FavoritesSection'

export function DepartmentTree({
  tree,
  pinnedGroup,
  isPinnedExpanded,
  onTogglePinned,
  expandedDepts,
  onToggleDept,
  onEmployeeTap,
  currentUserId,
  favoriteIds,
  favoriteDeptNames,
  isFavoritesExpanded,
  favoritesContent,
  onToggleFavorite,
  onToggleFavoriteDept,
  onToggleFavoritesExpanded,
}: DepartmentTreeProps) {
  const { avatarConfigByOwnerCode } = useDepartmentTree()
  // スクロール領域の端での親伝播を遮断
  const { scrollContainerProps } = useScrollChainGuard()

  return (
    <div
      {...scrollContainerProps}
      role='tree'
      aria-label='部署と社員ツリー'
      className='min-h-0 flex-1 overflow-y-auto px-2 pb-2 touch-pan-y [overscroll-behavior:contain] [-webkit-overflow-scrolling:touch]'
    >
      {/* お気に入りセクション（登録済みの社員がいる場合のみ最上部に表示） */}
      <FavoritesSection
        favoritesContent={favoritesContent}
        favoriteIds={favoriteIds}
        onToggleFavoriteDept={onToggleFavoriteDept}
        isFavoritesExpanded={isFavoritesExpanded}
        onToggleFavoritesExpanded={onToggleFavoritesExpanded}
        currentUserId={currentUserId}
        onEmployeeTap={onEmployeeTap}
        onToggleFavorite={onToggleFavorite}
        avatarConfigByOwnerCode={avatarConfigByOwnerCode}
      />

      {/* マイ部署ピン（自分の所属部署を最上部に固定表示） */}
      {pinnedGroup ? (
        <>
          <SectionLabel icon='push_pin' label='マイ部署' />
          <DepartmentGroupRow
            group={pinnedGroup}
            isExpanded={isPinnedExpanded}
            onToggle={onTogglePinned}
            onEmployeeTap={onEmployeeTap}
            currentUserId={currentUserId}
            isPinned
            isFavoriteDept={favoriteDeptNames.has(pinnedGroup.dept)}
            favoriteIds={favoriteIds}
            onToggleFavorite={onToggleFavorite}
            onToggleFavoriteDept={onToggleFavoriteDept}
            avatarConfigByOwnerCode={avatarConfigByOwnerCode}
          />
          <SectionLabel label='全ての部署' />
        </>
      ) : null}

      {tree.map(group => (
        <DepartmentGroupRow
          key={group.dept}
          group={group}
          isExpanded={expandedDepts.has(group.dept)}
          onToggle={() => onToggleDept(group.dept)}
          onEmployeeTap={onEmployeeTap}
          currentUserId={currentUserId}
          isFavoriteDept={favoriteDeptNames.has(group.dept)}
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
          onToggleFavoriteDept={onToggleFavoriteDept}
          avatarConfigByOwnerCode={avatarConfigByOwnerCode}
        />
      ))}
    </div>
  )
}

export default DepartmentTree
