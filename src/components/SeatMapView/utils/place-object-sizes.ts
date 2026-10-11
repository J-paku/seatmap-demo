import { GHOST_MIN_SIZE } from '@/utils/layout/rect'
import { DEFAULT_SEAT_HEIGHT, DEFAULT_SEAT_WIDTH } from '@/utils/layout/seat-relayout'

// 会議室の既定サイズ
export const FACILITY_DEFAULT_SIZE = { width: 200, height: 150 }
// 配置していない間に渡す寸法。参照を固定しないとゴースト側の初期化が毎レンダー走る
export const IDLE_SIZE = { width: 0, height: 0 }
// 会議室は座席1つ分より小さくしない。家具は共通の最小辺まで縮められる
export const FACILITY_MIN_SIZE = { width: DEFAULT_SEAT_WIDTH, height: DEFAULT_SEAT_HEIGHT }
export const FURNITURE_MIN_SIZE = { width: GHOST_MIN_SIZE, height: GHOST_MIN_SIZE }
