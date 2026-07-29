import { AvatarCustomizerModal } from './components/AvatarCustomizerModal'
import { useSelfAvatar } from '@/contexts/self-avatar-context'

// 開いている時だけモーダルをマウント(hooks の on/off を開閉に一致)
export const AvatarCustomizer = () => {
  const { isEditorOpen, selfAvatar, save, closeEditor } = useSelfAvatar()
  if (!isEditorOpen || !selfAvatar) return null
  return <AvatarCustomizerModal initial={selfAvatar} onSave={save} onClose={closeEditor} />
}
