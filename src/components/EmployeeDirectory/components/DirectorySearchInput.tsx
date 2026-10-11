// 社員ディレクトリの検索入力UIを描画するコンポーネント
import { triggerHaptic } from '@/utils/haptic'

interface DirectorySearchInputProps {
  query: string
  onQueryChange: (query: string) => void
}

export function DirectorySearchInput({ query, onQueryChange }: DirectorySearchInputProps) {
  return (
    <div className='px-4 py-3'>
      <div
        className='flex h-11 items-center gap-2 rounded-xl border px-3'
        style={{
          backgroundColor: 'var(--color-surface-elevated)',
          borderColor: 'var(--color-border)',
        }}
      >
        <span
          aria-hidden='true'
          className='icon-msr-filled text-[20px] leading-none'
          style={{ color: 'var(--color-text-muted)' }}
        >
          search
        </span>
        <input
          role='searchbox'
          aria-label='社員を検索'
          placeholder='社員を検索...'
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          className='h-full min-w-0 flex-1 bg-transparent text-base outline-none'
          style={{
            color: 'var(--color-text-primary)',
          }}
        />
        {query.length > 0 ? (
          <button
            type='button'
            onClick={() => {
              triggerHaptic('light')
              onQueryChange('')
            }}
            className='flex h-11 w-11 items-center justify-center rounded-lg'
            aria-label='検索をクリア'
          >
            <span
              aria-hidden='true'
              className='icon-msr-filled text-[20px] leading-none'
              style={{ color: 'var(--color-text-muted)' }}
            >
              close
            </span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
