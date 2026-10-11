import type { TourStep } from '@/components/CoachMarkTour/utils/tour-steps'

// メイン(閲覧)画面の使い方ガイド導線。分岐なしの4ステップ固定。
// エンジンのステップ定義(components/CoachMarkTour/utils/tour-steps.ts)は他ワーカー所有のため、
// この画面専用のステップはここに置く
// (このキーを含む全6本のコーチマーク既読キー一覧は tour-steps.ts 冒頭の表を見る)

export const MAIN_TOUR_STORAGE_KEY = 'seatmap_coach_main'

export const MAIN_TOUR_STEPS: readonly TourStep[] = [
  {
    selector: '[data-coach=layout-switcher]',
    text: 'フロアの切り替えと、保存したカスタムレイアウトの呼び出しはここからできます',
  },
  {
    selector: '[data-coach=header-menu]',
    text: 'メニューから社員ディレクトリを開いて、名前や部署で社員を探せます',
  },
  {
    selector: '[data-coach=zoom-controls]',
    text: '拡大・縮小・表示リセット。自席へ移動もここからできます',
  },
  {
    // チーム箱はキャンバス座標系にあり画面外の可能性があるため、表示時に中央へ寄せる
    selector: '[data-team-id]',
    text: 'チームの枠をタップすると、座席と在席状況を確認できます',
    centerOnShow: true,
  },
]
