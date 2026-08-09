// STEP2: フロア一覧の値・関数の単一ソース。型(FloorId)は types/index.ts が再エクスポートする
import type { Floor } from '@/types'

// STEP2: フロア一覧。表示順のとおりに並べる。公式レイアウトはこの一覧のぶんだけ存在する。
// フロアを増やす時はここに1行足し、同じidで lib/mock-loader.ts の種データレジストリへ登録する
export const FLOORS = [
  { floorId: 'floor-1', floorName: '本社1F' },
  { floorId: 'floor-2', floorName: '本社2F' },
] as const satisfies readonly Floor[]

// フロア識別子。一覧から導出するので、一覧と union がずれる余地を残さない
export type FloorId = (typeof FLOORS)[number]['floorId']

// 起動時と公式復帰時に開くフロア。静的書き出しHTMLも必ずこのフロアで焼かれる
export const DEFAULT_FLOOR_ID: FloorId = FLOORS[0].floorId

// 受け取った文字列が現存フロアidか検証する型ガード(保存値・LayoutSource の検証に使う)
export const isFloorId = (value: string): value is FloorId =>
  FLOORS.some((floor) => floor.floorId === value)

// フロア名の解決。未知のidは既定フロア名へ寄せ、呼び出し側に undefined を意識させない
export const floorNameOf = (floorId: string): string =>
  FLOORS.find((floor) => floor.floorId === floorId)?.floorName ?? FLOORS[0].floorName
