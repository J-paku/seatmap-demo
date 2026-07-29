// 電話番号(数字のみ11桁)を 3-4-4 区切りで表示整形
export const formatPhone = (digits: string): string =>
  digits.length === 11 ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}` : digits
