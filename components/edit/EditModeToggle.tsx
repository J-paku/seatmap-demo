// 07-admin-edit: 役割トグル(「閲覧」⇄「編集」)。編集モード進入の唯一の入口
// 編集モード中はトグル直接操作を無効化し、完了/キャンセル/×経由でのみ閲覧へ戻す
type Props = {
  isEditMode: boolean
  onEnterEdit: () => void
}

export const EditModeToggle = ({ isEditMode, onEnterEdit }: Props) => (
  <div className='role-toggle' role='group' aria-label='役割切り替え'>
    <button
      type='button'
      className={`role-toggle-btn${!isEditMode ? ' is-active' : ''}`}
      aria-pressed={!isEditMode}
      disabled={isEditMode}
      onClick={() => {
        // 編集モード中は無効化済みのため到達しない(閲覧は既に選択状態)
      }}
    >
      閲覧
    </button>
    <button
      type='button'
      className={`role-toggle-btn${isEditMode ? ' is-active' : ''}`}
      aria-pressed={isEditMode}
      disabled={isEditMode}
      onClick={onEnterEdit}
    >
      編集
    </button>
  </div>
)
