import styles from '../team-overlay-modal.module.css'

// §06-6: チーム削除の入口。本文の末尾に置くフッターで、押すとタイプ確認モーダルへ進む。
// 編集モードの間だけ出すかどうかは呼び出し側(OverlayBody)が決める

type Props = {
  teamName: string
  // 保存中は押せない
  isSaving: boolean
  onRequestDelete: () => void
}

export const TeamDeleteFooter = ({ teamName, isSaving, onRequestDelete }: Props) => (
  <div className={styles.teamDeleteFooter}>
    <button
      type='button'
      className={`pixel-btn ${styles.teamDeleteButton}`}
      onClick={onRequestDelete}
      disabled={isSaving}
    >
      <span className='material-symbols-outlined' aria-hidden='true'>
        delete_forever
      </span>
      {`${teamName}を削除`}
    </button>
  </div>
)
