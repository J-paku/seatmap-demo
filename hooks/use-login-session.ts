import { useCallback, useSyncExternalStore } from 'react'
import {
  getServerSessionAuthSnapshot,
  getSessionAuthSnapshot,
  subscribeSessionAuth,
  writeSessionAuth,
} from '@/lib/session-auth'

// sessionStorage は React の外にある状態なので useMediaQuery と同じく useSyncExternalStore で購読する。
// useEffect + setState にすると初回描画が「未確定」の空白になり、しかも lint に弾かれる
export const useLoginSession = () => {
  const storedAuth = useSyncExternalStore(
    subscribeSessionAuth,
    getSessionAuthSnapshot,
    getServerSessionAuthSnapshot
  )

  const authenticate = useCallback((loginId: string) => {
    writeSessionAuth(loginId)
  }, [])

  return { isAuthenticated: storedAuth !== null, authenticate }
}
