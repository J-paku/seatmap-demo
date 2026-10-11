export interface LoginGateProps {
  // ゲート通過時に呼ばれる。入力されたログインIDをそのまま渡す(検証はしない)
  onAuthenticated: (loginId: string) => void
}
