import type { LayoutSave } from '../hooks/use-layout-save'
import type { SeatMapData } from '../hooks/use-seat-map-data'
import type { SeatNavigation } from '../hooks/use-seat-navigation'
import type { SurfaceState } from '../hooks/use-surface-state'
import { EmployeeDirectory } from '@/components/EmployeeDirectory'
import type { useTheme } from '@/hooks/use-theme'
import { SELF_EMPLOYEE_ID } from '@/utils/demo-identity'

// 社員ディレクトリ(サイドバー)の面。
// アバター編集モーダルは移植版 EmployeeDirectory が内包する(設定パネル・フッターのアバターから開く)

type Props = {
  surface: SurfaceState
  data: SeatMapData
  nav: SeatNavigation
  save: LayoutSave
  theme: ReturnType<typeof useTheme>
}

export const DirectorySidebar = ({
  surface: { isDirectoryOpen, setIsDirectoryOpen },
  data: { directoryEmployees },
  nav: { handleDirectoryEmployeeSelect },
  save,
  theme: { themeMode, setTheme },
}: Props) => (
  <EmployeeDirectory
    isOpen={isDirectoryOpen}
    onClose={() => setIsDirectoryOpen(false)}
    employees={directoryEmployees}
    currentUserId={SELF_EMPLOYEE_ID}
    onEmployeeSelect={handleDirectoryEmployeeSelect}
    themeMode={themeMode}
    setTheme={setTheme}
    onResetLayout={save.resetLayout}
    onRefresh={() => {}}
    onGaroonLogout={() => {}}
  />
)
