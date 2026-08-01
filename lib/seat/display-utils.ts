// 表示系ユーティリティ（名前・時刻・座席ラベルのフォーマット）

const WHITESPACE_RE = /[\s\u3000]+/g

// 全角スペースも含む空白を除去して名前を正規化
// Garoonのname末尾には所属表記（例: 山田 太郎; (6600) サイバー事業部）が付くため、
// 座席側のbare nameとマッチさせる前にsuffixを除去する
export const normalizeName = (name: string) => name.split(/[;；]/)[0].replace(WHITESPACE_RE, '')

// 名前の姓部分を取得（アバター表示用・最大2文字）
export const getInitial = (name: string) => {
  const parts = name.trim().split(WHITESPACE_RE)
  const surname = parts[0] ?? ''
  return [...surname].slice(0, 2).join('') || '人'
}

// コンパクト表示用に名前の先頭語を取得
export const getCompactNameLabel = (name: string) => {
  const bareName = name.split(/[;；]/)[0]?.trim() ?? ''
  if (!bareName) return ''

  const parts = bareName.split(WHITESPACE_RE).filter(Boolean)
  return parts[0] ?? bareName
}

// イニシャル文字数に応じたフォントサイズクラスを返す
export const getInitialFontClass = (initial: string, size: 'sm' | 'md' | 'lg'): string => {
  const map = {
    sm: initial.length >= 2 ? 'text-[10px]' : 'text-xs',
    md: initial.length >= 2 ? 'text-xs' : 'text-sm',
    lg: initial.length >= 2 ? 'text-sm' : 'text-base',
  }
  return map[size]
}

// HH:mm 形式に変換（ISO文字列 or HH:mm をそのまま返す）
// 注意: getHours/getMinutes はブラウザのローカルタイムゾーンを前提とする。
// Garoon APIが返すISO文字列はオフセット付き（+09:00）のため、日本環境では正しくJST時刻が得られる。
export const formatTime = (value: string) => {
  if (value.length <= 5) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 電話番号の表示フォーマット
export function formatPhoneDisplay(phone: string): string {
  // ハイフン含みはそのまま返す
  if (phone.includes('-')) return phone

  const digits = phone.replace(/\D/g, '')

  // 11桁携帯: 090-xxxx-xxxx
  if (digits.length === 11 && /^0[789]0/.test(digits)) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  // 10桁固定電話: 03-xxxx-xxxx
  if (digits.length === 10) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}
