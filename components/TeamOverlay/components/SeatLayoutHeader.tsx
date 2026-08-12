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

// §06-4: 一括取込(部署一括取込)の入口は編集モードのヘッダー。シート内の同名ボタンではなく
// ここが仕様上の入口で、押すと社員検索シートが開く(選択と確定はシート側の担当)

// §06-2 座席モード: 固定席 ⇄ フリーアドレスのチップトグル(チーム属性 freeAddressEnabled)。
// 編集モードの時だけ描く。閲覧中に出さないのは、このヘッダーが「閲覧=ガイド+鉛筆 / 編集=一括取込+
// 編集中バッジ+終了」の排他入れ替えで出来ており、§06-2 のグリッド編集操作は全て編集モード側の
// 操作だから — 閲覧中に disabled で置くと、押せないのに状態だけ表示する死んだコントロールが増える。
// 見出し行(.sectionHead)は既に4要素が並ぶので、チップは直下の専用行へ出してグリッドと左端を揃える

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
  // 席が1件も無いチームでは開いても対象席が無いため、呼び出し側がfalseを渡してボタンごと隠す
  canBulkAssign?: boolean
  onBulkAssign?: () => void
  // §06-2: フリーアドレス設定の現在値と切り替え口。値の実体はチーム属性 Team.freeAddressEnabled で、
  // 編集中の差分解決は呼び出し側(use-overlay-edit-wiring)の1本が済ませている
  freeAddressEnabled?: boolean
  onToggleFreeAddress?: () => void
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
  canBulkAssign = false,
  onBulkAssign,
  freeAddressEnabled = false,
  onToggleFreeAddress,
}: Props) => (
  <>
    <div className={styles.sectionHead} style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
      <span className={`material-symbols-outlined ${styles.sectionIcon}`}>grid_view</span>
      <span className={styles.sectionTitle}>座席配置</span>
      <span className={styles.sectionCount}>{seatCount}席</span>
      {isEditMode && onExitEdit ? (
        <span className={styles.editStatus}>
          {onBulkAssign && canBulkAssign && (
            <button
              type='button'
              className={styles.bulkImport}
              aria-label='部署メンバーを一括取込'
              onClick={onBulkAssign}
              disabled={isSaving}
            >
              部署一括取込
            </button>
          )}
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
    {isEditMode && onToggleFreeAddress && (
      <div className={styles.seatModeRow} style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
        <span className={styles.seatModeLabel}>座席モード</span>
        <button
          type='button'
          role='switch'
          aria-label='フリーアドレス設定'
          aria-checked={freeAddressEnabled}
          className={styles.seatModeSwitch}
          onClick={onToggleFreeAddress}
          disabled={isSaving}
        >
          <span className={`${styles.seatModeChip}${freeAddressEnabled ? '' : ` ${styles.isOn}`}`}>固定席</span>
          <span className={`${styles.seatModeChip}${freeAddressEnabled ? ` ${styles.isOn}` : ''}`}>
            フリーアドレス
          </span>
        </button>
      </div>
    )}
    <div className={styles.sync} style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
      {loading ? '最新スケジュールを取得中…' : `最終取得 ${syncedAt}`}
    </div>
  </>
)
