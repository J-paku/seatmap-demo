// 座席配置セクションの見出しと同期状態。中身は分岐せず、モバイル時だけ
// グリッドの左右パディングに合わせて縦線を揃える

type Props = {
  seatCount: number
  loading: boolean
  syncedAt: string
  sidePadding: number
}

export const SeatLayoutHeader = ({ seatCount, loading, syncedAt, sidePadding }: Props) => (
  <>
    <div className='team-ovl-section-head' style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
      <span className='material-symbols-outlined team-ovl-section-icon'>grid_view</span>
      <span className='team-ovl-section-title'>座席配置</span>
      <span className='team-ovl-section-count'>{seatCount}席</span>
    </div>
    <div className='team-ovl-sync' style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
      {loading ? '最新スケジュールを取得中…' : `最終取得 ${syncedAt}`}
    </div>
  </>
)
