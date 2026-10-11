import { useCallback, useRef, useState } from 'react'

// 一過性のエラー文言。同じ文言を連続で出しても再演出されるよう id を振る

export type ErrorToastState = { id: number; message: string } | null

type ErrorToast = {
  errorToast: ErrorToastState
  showError: (message: string) => void
  dismissError: () => void
}

export const useErrorToast = (): ErrorToast => {
  const [errorToast, setErrorToast] = useState<ErrorToastState>(null)
  const seqRef = useRef(0)

  return {
    errorToast,
    showError: useCallback((message: string) => {
      seqRef.current += 1
      setErrorToast({ id: seqRef.current, message })
    }, []),
    dismissError: useCallback(() => setErrorToast(null), []),
  }
}
