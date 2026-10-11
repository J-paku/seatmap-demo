// 部署ツリーコンポーネント用の型定義
import type { Employee, PixelAvatarConfig } from '@/types'

interface DepartmentNode {
  dept: string
  employees: Employee[]
}

export interface FavoritesContent {
  departments: DepartmentNode[]
  employees: Employee[]
}

export interface DepartmentTreeProps {
  tree: DepartmentNode[]
  pinnedGroup: DepartmentNode | null
  isPinnedExpanded: boolean
  onTogglePinned: () => void
  expandedDepts: Set<string>
  onToggleDept: (dept: string) => void
  onEmployeeTap: (employee: Employee) => void
  currentUserId?: string
  favoriteIds: Set<string>
  favoriteDeptNames: Set<string>
  isFavoritesExpanded: boolean
  favoritesContent: FavoritesContent | null
  onToggleFavorite: (empId: string) => void
  onToggleFavoriteDept: (dept: string) => void
  onToggleFavoritesExpanded: () => void
}

export interface DepartmentGroupRowProps {
  group: DepartmentNode
  isExpanded: boolean
  onToggle: () => void
  onEmployeeTap: (employee: Employee) => void
  currentUserId?: string
  isPinned?: boolean
  isFavoriteDept?: boolean
  favoriteIds: Set<string>
  onToggleFavorite: (empId: string) => void
  onToggleFavoriteDept?: (dept: string) => void
  avatarConfigByOwnerCode: Map<string, PixelAvatarConfig>
}
