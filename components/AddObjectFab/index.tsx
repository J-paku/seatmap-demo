// 追加導線の入口。押すとカテゴリ選択が開き、+ が45度回って×に見える

type Props = {
  isOpen: boolean
  onToggle: () => void
}

export const AddObjectFab = ({ isOpen, onToggle }: Props) => (
  <button
    type='button'
    className={`add-obj-fab${isOpen ? ' is-open' : ''}`}
    aria-expanded={isOpen}
    aria-label={isOpen ? '追加メニューを閉じる' : 'オブジェクトを追加'}
    onClick={onToggle}
  >
    <span className='icon-msr-thin add-obj-fab-plus' aria-hidden='true'>
      add
    </span>
  </button>
)
