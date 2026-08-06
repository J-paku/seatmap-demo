import { PixelAvatar } from '@/components/PixelAvatar'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import type { Employee } from '@/types'

type Props = {
  employee: Employee
}

// 現在の会議の人物行: 32×32 アバター枠 + 氏名/役職/部署
// 席の有無に関わらずカードを開けるため、押せる/押せないを分けない
export const FacilityPersonRow = ({ employee }: Props) => {
  const { openPersonDetail } = useDetailPanel()
  const avatarConfig = useEmployeeAvatar(employee)

  return (
    <button
      type='button'
      className='fac-person-row fac-person-row-clickable'
      onClick={() => openPersonDetail(employee.id)}
    >
      <span className='fac-person-avatar-frame'>
        <PixelAvatar config={avatarConfig} size={28} />
      </span>
      <span className='fac-person-info'>
        <span className='fac-person-name'>{employee.name}</span>
        {employee.position && <span className='fac-person-role'>{employee.position}</span>}
        <span className='fac-person-dept'>{employee.team}</span>
      </span>
    </button>
  )
}
