import styles from '../team-overlay-modal.module.css'

// STEP D3: 編集モード下部のフローティングドック。保存とキャンセルの2つだけを持つ
// (席追加はグリッド側の空セル・エッジ＋ボタンへ移管済みのため、ここには置かない)

type Props = {
  // バッジ表示専用の件数。保存可否の判定には使わない(hasChangesを別に受け取る)
  changeCount: number
  // 「変更あり」の判定。changeCountだけでなくgridの移動・行列増減(isGridChanged)も含めて
  // 呼び出し側(TeamOverlay/index.tsx)が1本にまとめて渡す。ここで再計算しない
  // (同じ概念の判定基準を二重に持たないため)
  hasChanges: boolean
  isSaving: boolean
  onSave: () => void
  onCancel: () => void
}

export const EditDock = ({ changeCount, hasChanges, isSaving, onSave, onCancel }: Props) => (
  <div className={styles.dock} role='group' aria-label='編集ツールバー'>
    <button type='button' className={styles.dockCancel} aria-label='編集をキャンセル' onClick={onCancel}>
      <span className='material-symbols-outlined' aria-hidden='true'>
        close
      </span>
    </button>
    <button
      type='button'
      className={styles.dockSave}
      disabled={!hasChanges}
      aria-label={isSaving ? '保存中' : changeCount > 0 ? `保存(未保存の変更${changeCount}件)` : '保存'}
      onClick={onSave}
    >
      {isSaving && (
        <span className={`material-symbols-outlined ${styles.dockSaveIcon} ${styles.isSpinning}`} aria-hidden='true'>
          sync
        </span>
      )}
      <span className='team-ovl-dock-save-label'>{isSaving ? '保存中' : '保存'}</span>
      {!isSaving && changeCount > 0 && (
        <span className={styles.dockSaveBadge} aria-hidden='true'>
          {changeCount}
        </span>
      )}
    </button>
  </div>
)
