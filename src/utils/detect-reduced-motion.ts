// OS の「視差効果を減らす」設定が有効か。window の無い環境(サーバー描画)では false
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
