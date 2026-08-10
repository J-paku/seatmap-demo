// ディレクトリガイドのコーチマークステップ定義。文言・セレクタは固定。
// エンジン(components/CoachMarkTour)は導線ごとのステップを知らないので、
// このディレクトリ専用の定義はここに持つ

import type { TourStep } from '@/components/CoachMarkTour/utils/tour-steps'

// 既読フラグの localStorage キー
export const DIRECTORY_TOUR_STORAGE_KEY = 'seatmap_coach_directory'

// 分岐なしの直列3ステップ。対象はサイドバー内の固定要素なので centerOnShow は使わない
export const DIRECTORY_TOUR_STEPS: readonly TourStep[] = [
  {
    selector: '[data-coach="directory-search"]',
    text: '名前・部署・よみがなで社員を検索できます',
  },
  {
    selector: '[data-coach="directory-tree"]',
    text: '部署ツリーから社員をたどれます。★でお気に入りに登録できます',
  },
  {
    selector: '[data-coach="directory-footer"]',
    text: 'ここからテーマ切り替えなどの設定とアバター編集が開けます',
  },
]
