import { PixelAvatar } from '@/components/PixelAvatar'
import type { PixelAvatarConfig, Employee } from '@/types'

// 本人アバター(タップでアバター編集)と設定(デモでは無効)

type Props = {
  selfEmployee: Employee | null
  selfAvatar: PixelAvatarConfig | null
  onOpenAvatarEditor: () => void
}

export const DirectoryFooter = ({ selfEmployee, selfAvatar, onOpenAvatarEditor }: Props) => (
  <div className='emp-dir-footer'>
    {selfEmployee && (
      <button type='button' className='emp-dir-footer-avatar' onClick={onOpenAvatarEditor}>
        <PixelAvatar config={selfAvatar} size={28} />
        <span className='emp-dir-footer-name'>{selfEmployee.name}</span>
      </button>
    )}
    <button type='button' className='emp-dir-footer-settings' disabled>
      設定
    </button>
  </div>
)
