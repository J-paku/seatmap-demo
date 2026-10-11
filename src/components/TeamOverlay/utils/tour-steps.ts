// 座席配置ガイドのコーチマークステップ定義。文言・セレクタは固定。
// エンジン(components/CoachMarkTour)は導線ごとのステップを知らないので、
// このオーバーレイ専用の定義はここに持つ

import type { TourStep } from '@/components/CoachMarkTour/utils/tour-steps'

// 既読フラグの localStorage キー
export const SEAT_LAYOUT_TOUR_STORAGE_KEY = 'seatmap_coach_seatlayout'

// 分岐なしの直列2ステップ。対象はオーバーレイ内の要素で画面中央へ寄せる手段が無いため
// centerOnShow は使わない
export const SEAT_LAYOUT_TOUR_STEPS: readonly TourStep[] = [
  { selector: '[data-seat-id]', text: '座席をタップすると社員の詳細が見られます' },
  { selector: '[data-coach="overlay-edit"]', text: 'この鉛筆ボタンから座席の配置替えや配属の編集ができます' },
]
