// 社員の検索一致判定。氏名・カナ・部署を横断して引く。
// 「この社員は検索語に一致するか」の判定基準は1つだけにする — 画面ごとに書くと
// サイドバーでは引けるのに配属シートでは引けない、という食い違いが静かに生まれる
import type { Employee } from '@/types'

// ひらがな→カタカナ。NFKC が半角カナ・全角英数を畳んでくれるので、残るのはこの変換だけ
const hiraganaToKatakana = (value: string): string =>
  value.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))

export const normalizeSearchText = (value: string): string =>
  hiraganaToKatakana(value.normalize('NFKC').toLowerCase()).replace(/\s+/g, '')

const fieldsOf = (employee: Employee): string[] =>
  [
    employee.name,
    employee.nameKana,
    employee.team,
    employee.furiganaSei,
    employee.furiganaMei,
    // §06-4: 検索は名前・チーム・社員IDの部分一致。ここでの「社員ID」は内部合成キー(id)ではなく
    // 利用者が知っている4桁社員番号(ownerCode)を指す
    employee.ownerCode,
  ].filter((field): field is string => typeof field === 'string' && field.length > 0)

export const matchesEmployeeQuery = (employee: Employee, query: string): boolean => {
  const normalized = normalizeSearchText(query)
  if (normalized.length === 0) return true
  return fieldsOf(employee).some((field) => normalizeSearchText(field).includes(normalized))
}
