// 配属シートに出す文言の組み立て
import type { Employee } from '@/types'

// シート見出しの下に出す、対象席の今の状態
export const buildSeatNote = (occupant: Employee | null): string =>
  occupant ? `現在は${occupant.name}さんが着席しています` : '空席です'

// 一括選択の見出しに出す部署名。対象席のチームの部署が引けない時は総称で出す
export const labelBulkDepartment = (currentDepartment: string | null): string =>
  currentDepartment ?? '対象部署'
