// 06-team-overlay: チームカラーの単一レジストリ
// 「同じチーム=常に同じ色」を全画面で保証する唯一の参照元
import type { Team } from '@/types'

// レジストリが公開する2値(使用側はこれだけを参照する)
export type TeamColorEntry = {
  background: string
  foreground: string
  index: number
}

// #RRGGBB → {r,g,b}(0-255)
const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

// sRGB相対輝度(WCAG定義)
const relativeLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex)
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

// WCAG対比比(明るい方/暗い方)
const contrastRatio = (hexA: string, hexB: string) => {
  const la = relativeLuminance(hexA)
  const lb = relativeLuminance(hexB)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

// 背景色に対して対比比4.5:1以上を満たす方(黒/白)を選ぶ。両方満たす場合は対比の高い方
const pickForeground = (background: string) => {
  const blackContrast = contrastRatio(background, '#000000')
  const whiteContrast = contrastRatio(background, '#ffffff')
  return blackContrast >= whiteContrast ? '#000000' : '#ffffff'
}

const hslToHex = (h: number, s: number, l: number) => {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// 文字列の決定論的ハッシュ(同名→常に同値)
const hashString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

// 背景色から2値(背景・前景)を導出
const deriveEntry = (background: string, index: number): TeamColorEntry => ({
  background,
  foreground: pickForeground(background),
  index,
})

// 未登録チーム名の決定論的フォールバック色(彩度68%・明度50%固定)
const fallbackColor = (name: string): string => {
  const hue = hashString(name) % 360
  return hslToHex(hue, 68, 50)
}

// Team[] から レジストリ(teamId→3値)を構築する純粋関数
export const buildTeamColorRegistry = (teams: Team[]): Map<string, TeamColorEntry> => {
  const registry = new Map<string, TeamColorEntry>()
  teams.forEach((team, index) => {
    registry.set(team.id, deriveEntry(team.color, index))
  })
  return registry
}

// レジストリ未登録のteamId/teamNameを解決する(決定論的フォールバック)
export const resolveTeamColor = (
  registry: Map<string, TeamColorEntry>,
  teamId: string,
  fallbackName: string
): TeamColorEntry => {
  const found = registry.get(teamId)
  if (found) return found
  return deriveEntry(fallbackColor(fallbackName), registry.size)
}
