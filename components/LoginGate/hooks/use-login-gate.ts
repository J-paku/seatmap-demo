import { useCallback, useState } from 'react'
import { DEMO_LOGIN_ID, DEMO_PASSWORD } from '../utils/login-demo-credentials'
import type { LoginGateProps } from '../type'

export const useLoginGate = ({ onAuthenticated }: LoginGateProps) => {
  const [loginId, setLoginId] = useState(DEMO_LOGIN_ID)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  // 初期値は伏せ字のまま入れる。目のアイコンで切り替える
  const [passwordVisible, setPasswordVisible] = useState(false)
  // モバイルだけに出る「ログインでお困りの方」の開閉。PC は常時展開の aside なので使わない
  const [hintOpen, setHintOpen] = useState(false)

  const canSubmit = loginId.trim().length > 0 && password.length > 0

  const togglePasswordVisible = useCallback(() => {
    setPasswordVisible((visible) => !visible)
  }, [])

  const toggleHint = useCallback(() => {
    setHintOpen((open) => !open)
  }, [])

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!canSubmit) return
      onAuthenticated(loginId.trim())
    },
    [canSubmit, loginId, onAuthenticated]
  )

  return {
    loginId,
    setLoginId,
    password,
    setPassword,
    passwordVisible,
    togglePasswordVisible,
    hintOpen,
    toggleHint,
    canSubmit,
    handleSubmit,
  }
}
