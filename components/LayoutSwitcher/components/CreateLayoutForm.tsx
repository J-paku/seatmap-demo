import { useState } from 'react'
import type { FormEvent } from 'react'
import { MAX_CUSTOM_LAYOUTS } from '../utils/custom-layout-limit'
import { triggerHaptic } from '@/utils/haptic'
import styles from '../layout-switcher.module.css'

type Props = {
  layoutCount: number
  onCreate: (rawName: string) => void
}

// 展開パネル最下段: カスタムレイアウトの新規作成フォーム。上限に達したら入力欄自体を
// 出さずカウンターだけ残す(押せないボタンを置かない)。名前の既定値付与はhooks側が担う
export const CreateLayoutForm = ({ layoutCount, onCreate }: Props) => {
  const [name, setName] = useState('')
  const isFull = layoutCount >= MAX_CUSTOM_LAYOUTS

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    triggerHaptic('light')
    onCreate(name)
    setName('')
  }

  return (
    <div className={styles.createForm}>
      <div className={`${styles.createCounter}${isFull ? ` ${styles.isFull}` : ''}`}>
        {layoutCount}/{MAX_CUSTOM_LAYOUTS}
      </div>
      {!isFull && (
        <form className={styles.createRow} onSubmit={handleSubmit}>
          <input
            type='text'
            className={styles.createInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            placeholder='レイアウト名'
          />
          <button
            type='submit'
            className={styles.createSubmit}
            aria-label='新しいレイアウトを作成'
          >
            <span className='icon-msr-filled' aria-hidden='true'>
              add
            </span>
          </button>
        </form>
      )}
    </div>
  )
}
