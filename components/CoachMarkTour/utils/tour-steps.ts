// コーチマークのステップ定義。対象は CSS セレクタで指す。
// ここで使うセレクタは CLAUDE.md が固定を約束している DOM フックなので、消さない

export type TourFlow = 'layout' | 'facility'

export type TourStep = {
  // 対象要素。見つからなければそのステップは飛ばす(落とさない)
  selector: string
  text: string
}

// 分岐カードの選択肢。原本と同じく「何を動かすか」で再生するステップ列を変える
export const TOUR_FLOWS: readonly { flow: TourFlow; label: string; description: string }[] = [
  { flow: 'layout', label: '部署(テーブル)', description: '部署の区画を動かす手順を見ます' },
  { flow: 'facility', label: '会議室', description: '会議室を動かす手順を見ます' },
]

// 保存キーはフローごとに分ける。それぞれ初回だけ自動再生する
export const TOUR_STORAGE_KEY: Record<TourFlow, string> = {
  layout: 'seatmap_coach_layout',
  facility: 'seatmap_coach_facility',
}

const FINISH_STEP: TourStep = {
  selector: '.edit-remote-finish',
  text: '配置が決まったら『完了』を押すと保存されます',
}

export const TOUR_STEPS: Record<TourFlow, readonly TourStep[]> = {
  layout: [
    { selector: '[data-team-id]', text: '動かしたい部署(テーブル)をタップして選びます' },
    { selector: '[data-team-id]', text: 'そのままドラッグして、好きな位置へ動かせます' },
    {
      selector: '[data-team-id]',
      text: 'テーブルの大きさは中の座席数で自動的に決まります。枠を直接ドラッグして拡大・縮小はできません',
    },
    FINISH_STEP,
  ],
  facility: [
    { selector: '[data-facility="true"]', text: '動かしたい会議室をタップして選びます' },
    { selector: '[data-facility="true"]', text: 'そのままドラッグして、好きな位置へ動かせます' },
    {
      selector: '[data-coach="admin-fab"]',
      text: '左下の + から家具や会議室を新しく置けます',
    },
    FINISH_STEP,
  ],
}
