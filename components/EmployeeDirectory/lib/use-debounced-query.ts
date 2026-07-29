import { useEffect, useRef, useState } from 'react'
import { SEARCH_DEBOUNCE_MS } from '../utils/directory-constants'

// 検索語のデバウンス(200ms)

export const useDebouncedQuery = (query: string): string => {
  const [debounced, setDebounced] = useState('')
  const timerRef = useRef(0)

  useEffect(() => {
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timerRef.current)
  }, [query])

  return debounced
}
