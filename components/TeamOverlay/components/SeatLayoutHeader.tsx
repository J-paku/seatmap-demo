// 座席配置セクションの見出しと同期状態。モバイル時だけグリッドの左右パディングに合わせて
// 縦線を揃える。編集モードの出入口(鉛筆⇔編集中バッジ+終了)もここが同じ位置で持つ
//
// isEditMode / onEnterEdit / onExitEdit は STEP A3 時点では任意。呼び出し側(TeamOverlay/index.tsx)
// の配線は別 STEP の担当で、渡されない間は何も描かず既存表示を1ピクセルも変えない

// STEP D3: 「終了」はもう commit を兼ねない(保存は編集ドックの保存ボタンの1本だけに集約した)。
// ここでの終了は取消(discard)で、保存中に押すと保存中のdraft/gridが後始末されてしまうため
// isSavingの間はボタンごと無効化する

type Props = {
  seatCount: number
  loading: boolean
  syncedAt: string
  sidePadding: number
  isEditMode?: boolean
  isSaving?: boolean
  onEnterEdit?: () => void
  onExitEdit?: () => void
}

export const SeatLayoutHeader = ({
  seatCount,
  loading,
  syncedAt,
  sidePadding,
  isEditMode = false,
  isSaving = false,
  onEnterEdit,
  onExitEdit,
}: Props) => (
  <>
    <div className='team-ovl-section-head' style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
      <span className='material-symbols-outlined team-ovl-section-icon'>grid_view</span>
      <span className='team-ovl-section-title'>座席配置</span>
      <span className='team-ovl-section-count'>{seatCount}席</span>
      {isEditMode && onExitEdit ? (
        <span className='team-ovl-edit-status'>
          <span className='team-ovl-edit-badge'>編集中</span>
          <button type='button' className='team-ovl-edit-finish' onClick={onExitEdit} disabled={isSaving}>
            終了
          </button>
        </span>
      ) : (
        onEnterEdit && (
          <button
            type='button'
            className='team-ovl-edit-toggle'
            data-coach='overlay-edit'
            aria-label='所属人員を編集'
            onClick={onEnterEdit}
          >
            <span className='material-symbols-outlined' aria-hidden='true'>
              edit
            </span>
          </button>
        )
      )}
    </div>
    <div className='team-ovl-sync' style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
      {loading ? '最新スケジュールを取得中…' : `最終取得 ${syncedAt}`}
    </div>
  </>
)
