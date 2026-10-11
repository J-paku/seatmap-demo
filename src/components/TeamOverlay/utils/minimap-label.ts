// ミニマップ上のラベル整形。枠が小さいほど文字を詰めて、名前が矩形からはみ出さないようにする

// 枠内に描く最小寸法。これを下回ると矩形自体が見えなくなるので下駄を履かせる
export const MINIMAP_MIN_SIZE_PX = 2

type LabelStyle = { maxChars: number; fontSize: number }

// 窓に対する幅・高さの比から、載せられる文字数と文字サイズを決める
export const minimapLabelStyle = (widthRatio: number, heightRatio: number): LabelStyle => {
  if (widthRatio > 0.18 && heightRatio > 0.12) return { maxChars: 14, fontSize: 10 }
  if (widthRatio > 0.11) return { maxChars: 11, fontSize: 9 }
  return { maxChars: 9, fontSize: 8 }
}

// 超過分は末尾を … で詰める
export const truncateLabel = (label: string, maxChars: number): string =>
  label.length > maxChars ? `${label.slice(0, maxChars)}…` : label

// チーム名の改行や連続空白を1行へ均す(ミニマップの pill は1行しか置けない)
export const singleLineLabel = (label: string): string => label.replace(/\s+/g, ' ').trim()
