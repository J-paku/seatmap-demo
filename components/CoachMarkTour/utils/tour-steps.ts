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

// 編集モード導線の保存キー。分岐が1つのツアーの中に入ったのでキーも1本になる
// (旧 seatmap_coach_facility は参照を残さず廃止)
export const EDIT_TOUR_STORAGE_KEY = 'seatmap_coach_layout'

const FINISH_STEP: TourStep = {
  selector: '.edit-remote-finish',
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
