// useCanvasPointer(1本指のパン・タップ・慣性)が使う閾値

// 10: タップ距離閾値は仕様の8pxに合わせる(3pxだと微振動でタップが潰れる)
export const TAP_DISTANCE_THRESHOLD = 8
// ダブルタップ判定
export const DOUBLE_TAP_MS = 300
export const DOUBLE_TAP_DISTANCE = 40
// 慣性を開始する最低速度
export const INERTIA_MIN_SPEED = 1.5
// 慣性の初速に使う直近フレーム数
export const VELOCITY_SAMPLES = 4
