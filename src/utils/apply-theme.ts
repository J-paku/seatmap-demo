import { isDarkTheme } from '@/utils/theme'
import type { ThemeMode } from '@/types'

const ROOT_SELECTOR = '.seat-map-root'

// data-theme と dark クラスを同時に当てる(Tailwind の dark バリアントが移植コードで使われている)
export const applyTheme = (mode: ThemeMode): void => {
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR)
  if (!root) return
  if (mode === 'light') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
  root.classList.toggle('dark', isDarkTheme(mode))
}
