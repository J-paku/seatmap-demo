import { ActionBar } from './ActionBar'
import { ContactRow } from './ContactRow'
import { AlertDialog } from '@/components/AlertDialog'
import { PixelAvatar } from '@/components/PixelAvatar'
import { PresenceBadge } from '@/components/StatusChip'
import { formatPhone } from '../utils/format-phone'
import { useCopyField } from '../hooks/use-copy-field'
import { useIosOnlyNotice } from '../hooks/use-ios-only-notice'
import type { PixelAvatarConfig, Employee, PresenceStatus, Team } from '@/types'

// 12-member-detail: グラデーション帯 + はみ出しアバター + 4段テキスト + 連絡先

type Props = {
  employee: Employee
  team: Team | null
  avatar: PixelAvatarConfig | null
  status: PresenceStatus | undefined
  isBadgeVisible: boolean
  isScheduleLoading: boolean
  onGoToSeat?: () => void
  showSeatUnsetNotice?: boolean
}

export const ProfileCard = ({
  employee,
  team,
  avatar,
  status,
  isBadgeVisible,
  isScheduleLoading,
  onGoToSeat,
  showSeatUnsetNotice,
}: Props) => {
  const { copiedField, copy } = useCopyField()
  const iosNotice = useIosOnlyNotice()

  return (
    <div className='profile-card'>
      <div className='profile-band'>
        <PresenceBadge visible={isBadgeVisible} isLoading={isScheduleLoading} isOccupied status={status} />
        <div className='profile-avatar-frame'>
          <PixelAvatar config={avatar} size={52} />
        </div>
      </div>
      <div className='profile-body'>
        <div className='profile-text-stack'>
          <div className='profile-name-kana'>
            <span className='profile-name'>{employee.name}</span>
            {employee.nameKana && <span className='profile-kana'>{employee.nameKana}</span>}
          </div>
          {employee.position && <span className='profile-role'>{employee.position}</span>}
          {team && <span className='profile-dept'>{team.name}</span>}
        </div>

        {(employee.email || employee.phone) && (
          <div className='profile-contacts'>
            {employee.email && (
              <ContactRow
                field='email'
                icon='mail'
                copyLabel='メールアドレスをコピー'
                displayValue={employee.email}
                copyValue={employee.email}
                isCopied={copiedField === 'email'}
                onCopy={copy}
              />
            )}
            {employee.phone && (
              <ContactRow
                field='phone'
                icon='call'
                copyLabel='電話番号をコピー'
                displayValue={formatPhone(employee.phone)}
                copyValue={formatPhone(employee.phone)}
                isCopied={copiedField === 'phone'}
                onCopy={copy}
              />
            )}
          </div>
        )}
      </div>

      <ActionBar
        employeeName={employee.name}
        onRegisterContact={iosNotice.open}
        onGoToSeat={onGoToSeat}
        showSeatUnsetNotice={showSeatUnsetNotice}
      />

      <AlertDialog
        isOpen={iosNotice.isOpen}
        icon='contacts'
        title='iOSアプリ専用の機能です'
        body='電話帳への登録はiOSアプリでのみご利用いただけます。このデモはブラウザ版のため連絡先は保存されません。'
        confirmLabel='確認'
        onClose={iosNotice.close}
      />
    </div>
  )
}
