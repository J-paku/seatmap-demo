import styles from '../team-overlay-modal.module.css'
import { GuideButton } from '@/components/GuideButton'
import { triggerHaptic } from '@/utils/haptic'

// 座席配置セクションの見出し(タイトル/座席モード/席数/ガイド/編集の出入口)。
// 見た目と並びは本家 PiPiT-web の SeatLayoutHeader に揃える
//
// 同期状態の行はこの直下の ScheduleSyncBadge が持つ。ここは見出し行だけを描く
//
// onHelp(座席配置ガイド)は編集モードでない時だけ生成する。disabledで殺すのではなく
// 条件レンダーでそもそも作らない(編集中は鉛筆の代わりに終了ボタンが同じ位置に出るため)

// STEP D3: 「終了」はもう commit を兼ねない(保存は編集ドックの保存ボタンの1本だけに集約した)。
// ここでの終了は取消(discard)で、保存中に押すと保存中のdraft/gridが後始末されてしまうため
// isSavingの間はボタンごと無効化する

// §06-4: 一括取込(部署一括取込)の入口は編集モードのヘッダー。シート内の同名ボタンではなく
// ここが仕様上の入口で、押すと社員検索シートが開く(選択と確定はシート側の担当)

// §06-2 座席モード: 固定席 ⇄ フリーアドレス(チーム属性 freeAddressEnabled)は
// 「チップ=常時出る状態表示 / スイッチ=編集モード中だけ出る操作」の2部品に分ける。
// 閲覧中も現在値が読めないと、その席が固定席として空いているのか流動席なのか区別できない。
// 操作だけを編集モードに閉じれば、押せないのに置いてある死んだコントロールも生まれない

type Props = {
  seatCount: number
  sidePadding: number
  // モバイル時は横幅が足りないので2段に組み替える(呼び出し側の useIsCompactMobile の値)
  isCompactMobile: boolean
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
  sidePadding,
  isCompactMobile,
  isEditMode = false,
  isSaving = false,
  onEnterEdit,
  onExitEdit,
  onHelp,
  canBulkAssign = false,
  onBulkAssign,
  freeAddressEnabled = false,
  onToggleFreeAddress,
}: Props) => {
  const titleNode = (
    <span className={styles.seatTitleGroup}>
      <span className={`icon-msr-filled ${styles.seatTitleIcon}`} aria-hidden='true'>
        grid_view
      </span>
      座席配置
    </span>
  )

  const countNode = <span className={styles.seatCount}>{seatCount}席</span>

  // 座席モードチップ。閲覧中も含めて常に同じ見た目で現在値を出す
  const chipNode = (
    <span className={`${styles.modeChip}${freeAddressEnabled ? ` ${styles.isFree}` : ''}`}>
      <span className='icon-msr-filled' aria-hidden='true'>
        {freeAddressEnabled ? 'shuffle' : 'push_pin'}
      </span>
      {freeAddressEnabled ? 'フリーアドレス' : '固定席'}
    </span>
  )

  const switchNode = isEditMode && onToggleFreeAddress && (
    <button
      type='button'
      role='switch'
      aria-checked={freeAddressEnabled}
      aria-label='フリーアドレス設定'
      className={styles.modeSwitch}
      disabled={isSaving}
      onClick={() => {
        triggerHaptic('light')
        onToggleFreeAddress()
      }}
    >
      <span className={styles.modeSwitchKnob} aria-hidden='true' />
    </button>
  )

  const bulkImportNode = isEditMode && onBulkAssign && canBulkAssign && (
    <button
      type='button'
      className={styles.bulkImport}
      aria-label='部署メンバーを一括取込'
      disabled={isSaving}
      onClick={() => {
        triggerHaptic('light')
        onBulkAssign()
      }}
    >
      部署一括取込
    </button>
  )

  const helpNode = !isEditMode && onHelp && <GuideButton ariaLabel='座席配置ガイド' onClick={onHelp} />

  // data-coach はコーチマークツアーの固定フックなので付け替えない
  const enterEditNode = !isEditMode && onEnterEdit && (
    <button
      type='button'
      className={styles.editToggle}
      data-coach='overlay-edit'
      aria-label='所属人員を編集'
      onClick={() => {
        triggerHaptic('light')
        onEnterEdit()
      }}
    >
      <span className='icon-msr-filled' aria-hidden='true'>
        edit
      </span>
    </button>
  )

  // 編集中バッジ+終了✕。鉛筆が消えた同じ位置に入れ替わりで入る
  const editingNode = isEditMode && onExitEdit && (
    <span className={styles.editStatus}>
      <span className={styles.editBadge}>編集中</span>
      <button
        type='button'
        className={styles.editExit}
        aria-label='編集を終了'
        disabled={isSaving}
        onClick={() => {
          triggerHaptic('light')
          onExitEdit()
        }}
      >
        <span className='icon-msr-filled' aria-hidden='true'>
          close
        </span>
      </button>
    </span>
  )

  // モバイルは1行に詰めると全要素が折り返すため、
  // 「タイトル+席数+操作」と「座席モード+一括取込」の2段に分ける
  if (isCompactMobile) {
    return (
      <div
        className={styles.seatHeadCompact}
        style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}
      >
        <div className={styles.seatHeadRow}>
          {titleNode}
          <span className={styles.seatHeadActions}>
            {countNode}
            {helpNode}
            {enterEditNode}
            {editingNode}
          </span>
        </div>
        <div className={styles.seatModeLine}>
          {chipNode}
          {switchNode}
          {bulkImportNode}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.seatHead} style={{ paddingLeft: sidePadding, paddingRight: sidePadding }}>
      <span className={styles.seatHeadLead}>
        {titleNode}
        {chipNode}
        {switchNode}
      </span>
      <span className={styles.seatHeadActions}>
        {bulkImportNode}
        {countNode}
        {helpNode}
        {enterEditNode}
        {editingNode}
      </span>
    </div>
  )
}
