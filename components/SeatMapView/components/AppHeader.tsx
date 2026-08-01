import { PixelAvatar } from '@/components/PixelAvatar'
import { EditModeToggle } from '@/components/edit/EditModeToggle'
import type { PixelAvatarConfig } from '@/types'

// 閲覧モードのヘッダー(メニュー・レイアウトリセット・編集トグル・本人アバター)

type Props = {
  selfAvatar: PixelAvatarConfig | null
  onOpenDirectory: () => void
  onResetLayout: () => void
  onEnterEdit: () => void
  onOpenAvatarEditor: () => void
}

export const AppHeader = ({
  selfAvatar,
  onOpenDirectory,
  onResetLayout,
  onEnterEdit,
  onOpenAvatarEditor,
}: Props) => (
  <header className='app-header'>
    <button type='button' className='app-header-btn' aria-label='メニュー' onClick={onOpenDirectory}>
      <span className='material-symbols-outlined' aria-hidden='true'>
        menu
      </span>
    </button>
    <span className='app-header-title'>座席マップ</span>
    <div className='app-header-right'>
      {/* 07: レイアウトをリセット(保存分削除→種データ復元)。役割トグルの隣に設置 */}
      <button type='button' className='app-header-btn' aria-label='レイアウトをリセット' onClick={onResetLayout}>
        <span className='material-symbols-outlined' aria-hidden='true'>
          restart_alt
        </span>
      </button>
      <EditModeToggle isEditMode={false} onEnterEdit={onEnterEdit} />
      {selfAvatar && (
        <button type='button' className='app-header-avatar' aria-label='アバターを編集' onClick={onOpenAvatarEditor}>
          <PixelAvatar config={selfAvatar} size={30} />
        </button>
      )}
    </div>
  </header>
)
