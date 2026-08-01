import { EditModeToggle } from '@/components/edit/EditModeToggle'

// 閲覧モードのヘッダー(メニュー・レイアウトリセット・編集トグル・本人アバター)

type Props = {
  onOpenDirectory: () => void
  onResetLayout: () => void
  onEnterEdit: () => void
}

export const AppHeader = ({
  onOpenDirectory,
  onResetLayout,
  onEnterEdit,
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
    </div>
  </header>
)
