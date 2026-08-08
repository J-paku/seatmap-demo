import { useState } from 'react'
import { PickerSheet } from '@/components/PickerSheet'
import styles from '../object-picker.module.css'

// 新しいチームの名前と色を決める。確定するとゴーストで配置へ進む

// 選びやすい既定色。原本の部署色と同じ系統から6つ
const PRESET_COLORS = ['#C66A53', '#4F83CC', '#5B9E6B', '#B06FA8', '#C79A3D', '#5E7A99']
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

type Props = {
  isOpen: boolean
  onSubmit: (name: string, color: string) => void
  onClose: () => void
}

export const TeamCreatePopover = ({ isOpen, onSubmit, onClose }: Props) => {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  // テキスト欄は入力途中の不正値も持てるようにカラー値と別に持つ
  const [hexText, setHexText] = useState(PRESET_COLORS[0])

  const applyColor = (next: string) => {
    setColor(next)
    setHexText(next)
  }

  const onHexChange = (next: string) => {
    setHexText(next)
    // 不正な値はテキスト側で弾き、カラー値へは通さない
    if (HEX_PATTERN.test(next)) setColor(next)
  }

  const canSubmit = name.trim().length > 0

  return (
    <PickerSheet isOpen={isOpen} title='チームを作る' note='名前と色を決めると配置に進みます' onClose={onClose}>
      <label className={styles.teamNewLabel} htmlFor='team-new-name'>
        チーム名
      </label>
      <input
        id='team-new-name'
        className={styles.assignSearch}
        placeholder='例: チーム E'
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      <span className={styles.teamNewLabel}>色</span>
      <div className={styles.teamNewSwatches}>
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            type='button'
            className={`${styles.teamNewSwatch}${preset === color ? ` ${styles.isSelected}` : ''}`}
            style={{ background: preset }}
            aria-label={`色 ${preset}`}
            aria-pressed={preset === color}
            onClick={() => applyColor(preset)}
          />
        ))}
      </div>
      <div className={styles.teamNewCustom}>
        <input
          type='color'
          className={styles.teamNewColorInput}
          aria-label='色を選ぶ'
          value={color}
          onChange={(e) => applyColor(e.target.value)}
        />
        <input
          className={`${styles.assignSearch} ${styles.teamNewHex}${HEX_PATTERN.test(hexText) ? '' : ` ${styles.isInvalid}`}`}
          aria-label='色コード'
          value={hexText}
          onChange={(e) => onHexChange(e.target.value)}
          spellCheck={false}
        />
      </div>

      <button
        type='button'
        className={`pixel-btn ${styles.teamNewSubmit}`}
        disabled={!canSubmit}
        onClick={() => onSubmit(name.trim(), color)}
      >
        配置へ進む
      </button>
    </PickerSheet>
  )
}
