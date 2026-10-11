// コーチマークのステップ定義。対象は CSS セレクタで指す。
// ここで使うセレクタは CLAUDE.md が固定を約束している DOM フックなので、消さない

export type TourStep = {
  // 対象要素の CSS セレクタ。未指定なら中央カード(スポットライトなし)
  selector?: string
  text: string
  // 表示時に対象を画面中央へ寄せる
  centerOnShow?: boolean
}

// 分岐カードの選択肢。原本と同じく「何を動かすか」で再生するステップ列を変える
type TourBranchOption = {
  key: string
  label: string
  description: string
  steps: readonly TourStep[]
}

export type TourBranch = {
  title: string
  options: readonly TourBranchOption[]
}

// コーチマーク既読キーは全画面で6本ある。同じ「seatmap_coach_*」接頭辞でどれがどのフローか
// 混同しやすいので(実際に本セッションで複数ラウンド取り違えが発生した)、一覧をここに1つだけ置く。
// 各キーの実体(steps/branch)の定義場所は右列の通りで、そこ以外に同じ概念の判定を増やさない。
//
// | キー                        | フロー                                   | 定義場所 |
// |----------------------------|------------------------------------------|----------|
// | seatmap_coach_main         | メイン(閲覧)画面の使い方ガイド            | components/SeatMapView/utils/main-tour-steps.ts |
// | seatmap_coach_directory     | 社員名簿の使い方ガイド                    | components/EmployeeDirectory/utils/tour-steps.ts |
// | seatmap_coach_seatlayout    | チームオーバーレイ内 座席レイアウト編集   | components/TeamOverlay/utils/tour-steps.ts |
// | seatmap_coach_layout        | 編集セッション: 部署(テーブル)/会議室を動かす手順(このファイルの EDIT_TOUR_BRANCH) | このファイル |
// | seatmap_coach_team          | 編集セッション: チーム新規配置(配置→ドラッグ→確定)(このファイルの TEAM_TOUR_STEPS) | このファイル |
// | seatmap_coach_furniture     | 編集セッション: 家具/会議室新規配置(配置→ドラッグ→確定)(このファイルの FURNITURE_TOUR_STEPS) | このファイル |

// 編集モード「レイアウトを編集」導線の保存キー。分岐が1つのツアーの中に入ったのでキーも1本になる
// (旧 seatmap_coach_facility は参照を残さず廃止)
export const EDIT_TOUR_STORAGE_KEY = 'seatmap_coach_layout'

const FINISH_STEP: TourStep = {
  selector: 'button[aria-label="編集を完了"]',
  text: '配置が決まったら『完了』を押すと保存されます',
}

// 編集モードのコーチマーク導線。文言・セレクタは移行前と同一。
// team-id / facility 対象の各ステップだけ centerOnShow を付け、旧来の
// 「画面外なら自動で中央へ寄せる」動作をエンジンの明示フラグとして再現する
export const EDIT_TOUR_BRANCH: TourBranch = {
  title: '何を動かしますか？',
  options: [
    {
      key: 'layout',
      label: '部署(テーブル)',
      description: '部署の区画を動かす手順を見ます',
      steps: [
        { selector: '[data-team-id]', text: '動かしたい部署(テーブル)をタップして選びます', centerOnShow: true },
        { selector: '[data-team-id]', text: 'そのままドラッグして、好きな位置へ動かせます', centerOnShow: true },
        {
          selector: '[data-team-id]',
          text: 'テーブルの大きさは中の座席数で自動的に決まります。枠を直接ドラッグして拡大・縮小はできません',
          centerOnShow: true,
        },
        FINISH_STEP,
      ],
    },
    {
      key: 'facility',
      label: '会議室',
      description: '会議室を動かす手順を見ます',
      steps: [
        {
          selector: '[data-facility="true"]',
          text: '動かしたい会議室をタップして選びます',
          centerOnShow: true,
        },
        {
          selector: '[data-facility="true"]',
          text: 'そのままドラッグして、好きな位置へ動かせます',
          centerOnShow: true,
        },
        {
          selector: '[data-coach="admin-fab"]',
          text: '左下の + から家具や会議室を新しく置けます',
        },
        FINISH_STEP,
      ],
    },
  ],
}

// §05-7: FAB→「チーム」/FAB→「設備」からの新規配置ガイド。ゴーストは常に画面中央に出るため
// スポットライトする対象が無い。selector を持たせず、CoachMarkTour を「対象なし」の分岐(中央
// カード+全面ダイム、パルス枠なし)のまま3ステップ直列で再生させる
export const TEAM_TOUR_STORAGE_KEY = 'seatmap_coach_team'

export const TEAM_TOUR_STEPS: readonly TourStep[] = [
  { text: 'チームを追加すると、画面中央にゴースト枠が表示されます' },
  { text: 'そのままドラッグして、置きたい位置へ動かせます' },
  { text: '位置が決まったら『配置』を押すと確定します' },
]

// 家具ピッカー・施設(会議室)ピッカーのどちらから来てもゴースト配置の手順は共通なので、
// フローを分けず1本にまとめる(§05-7 が定義するキーは team/furniture/layout の3本のみで、
// 施設単体の seatmap_coach_facility は存在しない)
export const FURNITURE_TOUR_STORAGE_KEY = 'seatmap_coach_furniture'

export const FURNITURE_TOUR_STEPS: readonly TourStep[] = [
  { text: '家具や会議室を選ぶと、画面中央にゴースト枠が表示されます' },
  { text: 'そのままドラッグして、置きたい位置へ動かせます' },
  { text: '位置が決まったら『配置』を押すと確定します' },
]
