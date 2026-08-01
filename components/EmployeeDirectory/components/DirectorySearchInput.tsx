// 社員ディレクトリの検索入力UIを描画するコンポーネント
import { triggerHaptic } from '@/lib/haptic'

interface DirectorySearchInputProps {
  query: string
  onQueryChange: (query: string) => void
  isDark: boolean
}

export function DirectorySearchInput({ query, onQueryChange, isDark }: DirectorySearchInputProps) {
  return (
    <div className='px-4 py-3'>
      <div
        className='flex h-11 items-center gap-2 rounded-xl border px-3'
        style={{
          backgroundColor: isDark ? '#1F2230' : '#FFFFFF',
          borderColor: isDark ? '#374151' : '#E5E7EB',
        }}
      >
        <span
          aria-hidden='true'
          className='icon-msr-filled text-[20px] leading-none'
          style={{ color: isDark ? '#B8C0DD' : '#6B7280' }}
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
            color: isDark ? '#F8F8F2' : '#1A1A1A',
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
              style={{ color: isDark ? '#B8C0DD' : '#6B7280' }}
            >
              close
            </span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
