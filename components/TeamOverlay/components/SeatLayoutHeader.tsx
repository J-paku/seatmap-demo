import styles from '../team-overlay-modal.module.css'
import { GuideButton } from '@/components/GuideButton'

// 座席配置セクションの見出しと同期状態。モバイル時だけグリッドの左右パディングに合わせて
// 縦線を揃える。編集モードの出入口(鉛筆⇔編集中バッジ+終了)もここが同じ位置で持つ
//
// isEditMode / onEnterEdit / onExitEdit は STEP A3 時点では任意。呼び出し側(TeamOverlay/index.tsx)
// の配線は別 STEP の担当で、渡されない間は何も描かず既存表示を1ピクセルも変えない
//
// onHelp(座席配置ガイド)は編集モードでない時だけ生成する。disabledで殺すのではなく
// 条件レンダーでそもそも作らない(編集中は鉛筆の代わりに終了ボタンが同じ位置に出るため)

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
  onHelp?: () => void
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
  onHelp,
}: Props) => (
  <>
    <div className={styles.sectionHead} style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
      <span className={`material-symbols-outlined ${styles.sectionIcon}`}>grid_view</span>
      <span className={styles.sectionTitle}>座席配置</span>
      <span className={styles.sectionCount}>{seatCount}席</span>
      {isEditMode && onExitEdit ? (
        <span className={styles.editStatus}>
          <span className={styles.editBadge}>編集中</span>
          <button type='button' className={styles.editFinish} onClick={onExitEdit} disabled={isSaving}>
            終了
          </button>
        </span>
      ) : (
        <>
          {onHelp && (
            <GuideButton ariaLabel='座席配置ガイド' onClick={onHelp} className='ml-2' />
          )}
          {onEnterEdit && (
            <button
              type='button'
              className={styles.editToggle}
              data-coach='overlay-edit'
              aria-label='所属人員を編集'
              onClick={onEnterEdit}
            >
              <span className='material-symbols-outlined' aria-hidden='true'>
                edit
              </span>
            </button>
          )}
        </>
      )}
    </div>
    <div className={styles.sync} style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
      {loading ? '最新スケジュールを取得中…' : `最終取得 ${syncedAt}`}
    </div>
  </>
)
