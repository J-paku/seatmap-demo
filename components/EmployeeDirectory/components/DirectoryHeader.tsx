import type { RefObject } from 'react'

// 検索欄と閉じるボタン

type Props = {
  query: string
  searchInputRef: RefObject<HTMLInputElement | null>
  closeBtnRef: RefObject<HTMLButtonElement | null>
  onChangeQuery: (query: string) => void
  onClose: () => void
}

export const DirectoryHeader = ({ query, searchInputRef, closeBtnRef, onChangeQuery, onClose }: Props) => (
  <div className='emp-dir-header'>
    <div className='emp-dir-search-wrap'>
      <span className='emp-dir-search-icon'>⌕</span>
      <input
        ref={searchInputRef}
        type='text'
        role='searchbox'
        aria-label='社員を検索'
        placeholder='社員を検索...'
        className='emp-dir-search-input'
        value={query}
        onChange={(e) => onChangeQuery(e.target.value)}
      />
      {query.length > 0 && (
        <button
          type='button'
          className='emp-dir-search-clear'
          aria-label='検索をクリア'
          onClick={() => onChangeQuery('')}
        >
          ✕
        </button>
      )}
    </div>
    <button ref={closeBtnRef} type='button' className='emp-dir-close-btn' aria-label='閉じる' onClick={onClose}>
      ✕
    </button>
  </div>
)
