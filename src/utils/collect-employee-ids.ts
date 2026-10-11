import { EMPLOYEES } from '@/lib/mock-loader'

// 実在する社員idの集合。保存レイアウトを読む時に、実在しない社員を指す座席を空席へ戻すために渡す。
// EMPLOYEES はモジュール定数で初回レンダー時点から確定しているのでモジュールスコープに置く
// (useEmployees() の SWR データを使うと初期レンダーで undefined になり、その時だけ全座席が
// 空席に見えるレースが起きる)
export const VALID_EMPLOYEE_IDS: ReadonlySet<string> = new Set(
  EMPLOYEES.map(employee => employee.id)
)
