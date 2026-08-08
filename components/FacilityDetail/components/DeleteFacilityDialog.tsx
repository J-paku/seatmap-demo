import { useState } from 'react'
import styles from '../facility-detail.module.css'

// 誤操作を防ぐため、この語を完全一致で入力させてから確定できるようにする
const CONFIRM_WORD = '削除'

type Props = {
  facilityName: string
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

// 施設削除の確認ダイアログ。既存の .edit-dialog 系スタイルを流用する
export const DeleteFacilityDialog = ({ facilityName, isDeleting, onConfirm, onCancel }: Props) => {
  const [typed, setTyped] = useState('')
  const canConfirm = typed === CONFIRM_WORD && !isDeleting

  return (
    <div className='edit-dialog-backdrop' onClick={onCancel}>
      <div
        className='edit-dialog'
        role='dialog'
        aria-modal='true'
        aria-label='施設削除の確認'
        onClick={(e) => e.stopPropagation()}
      >
        <p className='edit-dialog-message'>この施設を削除しますか？</p>
        <p className={styles.facDeleteDesc}>
          「{facilityName}」が削除されます。続行するには
          <strong className={styles.facDeleteWord}>{CONFIRM_WORD}</strong>と入力してください。
        </p>
        <input
          type='text'
          className={styles.facDeleteInput}
          value={typed}
          placeholder={CONFIRM_WORD}
          onChange={(e) => setTyped(e.target.value)}
          aria-label='削除確認の入力'
        />
        <div className='edit-dialog-actions'>
          <button type='button' className='pixel-btn edit-dialog-cancel' onClick={onCancel}>
            キャンセル
          </button>
          <button
            type='button'
            className='pixel-btn edit-dialog-confirm'
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {isDeleting ? '削除中...' : CONFIRM_WORD}
          </button>
        </div>
      </div>
    </div>
  )
}
