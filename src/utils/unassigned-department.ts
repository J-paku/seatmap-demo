// 所属部署が空の社員をまとめる部署名と、所属部署名の正規化(useEmployeeDirectory・useEmployeeAssign が使う)

export const UNASSIGNED_DEPARTMENT = '未所属'

// 所属部署名の正規化。前後の空白を落とし、空文字・空白だけは「未所属」に丸める
export const normalizeDepartment = (team: string): string => {
  const trimmed = team.trim()
  return trimmed.length > 0 ? trimmed : UNASSIGNED_DEPARTMENT
}
