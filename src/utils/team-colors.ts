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

// WCAG の線形区間(c ≤ 0.03928)は、0〜255 の整数の値では 0〜10(11 未満)に当たる
const LINEAR_SEGMENT_LIMIT = 11

// sRGB相対輝度(WCAG定義)
const relativeLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex)
  const channel = (v: number) => {
    const c = v / 255
    return v < LINEAR_SEGMENT_LIMIT ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
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
  // 対比の高い方。同じなら黒
  return Math.max(blackContrast, whiteContrast) === blackContrast ? '#000000' : '#ffffff'
}

// 未登録チームのフォールバック色の彩度・明度(68%・50%)。
// 明度50%では HSL の chroma((1 - |2L - 1|) × S)が彩度そのものになる
const FALLBACK_CHROMA = 68 / 100
const FALLBACK_LIGHTNESS = 50 / 100

// 0〜255 の整数を2桁の16進へ(0x100 を足して3桁にし、先頭の1を落とす)
const toHexByte = (value: number) => (0x100 + value).toString(16).slice(1)

// 色相(0以上360未満)→ 彩度68%・明度50%の #rrggbb
const hueToHex = (h: number) => {
  const c = FALLBACK_CHROMA
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = FALLBACK_LIGHTNESS - c / 2
  // 色相60度ごとの区間で、r・g・b のどれに c・x・0 を入れるかが決まる
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][Math.floor(h / 60)]
  const toHex = (v: number) => toHexByte(Math.round((v + m) * 255))
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
  return hueToHex(hue)
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
