import { PixelAvatar } from '@/components/PixelAvatar'
import { useEmployeeAvatar } from '@/hooks/use-employee-avatar'
import { useDetailPanel } from '@/contexts/detail-panel-context'
import { useSeats } from '@/lib/mock-loader'
import type { Employee } from '@/types'

type Props = {
  employee: Employee
}

// 現在の会議の人物行: 32×32 アバター枠 + 氏名/役職/部署
// 座席を持つ社員のみクリック可(座席が無ければ div で描き押せることを見せない)
export const FacilityPersonRow = ({ employee }: Props) => {
  const { data: seats } = useSeats()
  const { openSeatDetail } = useDetailPanel()
  const avatarConfig = useEmployeeAvatar(employee)
  const seat = (seats ?? []).find((s) => s.employeeId === employee.id)

  const content = (
    <>
      <span className='fac-person-avatar-frame'>
        <PixelAvatar config={avatarConfig} size={28} />
      </span>
      <span className='fac-person-info'>
        <span className='fac-person-name'>{employee.name}</span>
        {employee.position && <span className='fac-person-role'>{employee.position}</span>}
        <span className='fac-person-dept'>{employee.team}</span>
      </span>
    </>
  )

  if (!seat) {
    return <div className='fac-person-row'>{content}</div>
  }

  return (
    <button
      type='button'
      className='fac-person-row fac-person-row-clickable'
      onClick={() => openSeatDetail(seat.id)}
    >
      {content}
    </button>
  )
}
