import type { Employee, Seat } from '@/types'

export type EmployeeDirectoryProps = {
  isOpen: boolean
  onClose: () => void
  onSelectEmployee: (employee: Employee, seat: Seat | null) => void
  onOpenAvatarEditor: () => void
}

export type DeptGroup = {
  teamName: string
  // 部署名の読み(全角カタカナ)。かな検索でグループごと引っ掛けるための検索用フィールド(未所属は空文字)
  teamKana: string
  members: Employee[]
}

// お気に入りの操作口(社員単位と部署単位の2系統)
export type DirectoryFavorites = {
  employeeIds: Set<string>
  deptNames: Set<string>
  members: Employee[]
  toggleEmployee: (empId: string) => void
  toggleDept: (teamName: string) => void
}
