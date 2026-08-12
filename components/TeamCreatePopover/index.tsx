import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { PickerSheet } from '@/components/PickerSheet'
import { normalizeHex } from '@/utils/color'
import styles from '../object-picker.module.css'

// 新しいチームの名前と色を決める。確定するとゴーストで配置へ進む

// 選びやすい既定色。原本の部署色と同じ系統から6つ(仕様外・デモの利便機能として残す)
const PRESET_COLORS = ['#C66A53', '#4F83CC', '#5B9E6B', '#B06FA8', '#C79A3D', '#5E7A99']
// 仕様(§02-2)既定色。プリセットには含めない
const DEFAULT_TEAM_COLOR = '#3B82F6'
const HEX_FORMAT_ERROR = 'HEX形式(#RGB / #RRGGBB)で入力してください'

type Props = {
  isOpen: boolean
  onSubmit: (name: string, color: string) => void
  onClose: () => void
}

export const TeamCreatePopover = ({ isOpen, onSubmit, onClose }: Props) => {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_TEAM_COLOR)
  // テキスト欄は入力途中の不正値も持てるようにカラー値と別に持つ
  const [hexText, setHexText] = useState(DEFAULT_TEAM_COLOR)

  const applyColor = (next: string) => {
    setColor(next)
    setHexText(next)
  }

  const onHexChange = (next: string) => {
    setHexText(next)
    // 正規化できた値だけカラー値へ通す。不正な途中入力はテキスト側にだけ残す
    const normalized = normalizeHex(next)
    if (normalized) setColor(normalized)
  }

  const canSubmit = name.trim().length > 0
  const isHexInvalid = hexText.length > 0 && normalizeHex(hexText) === null

  const submit = () => {
    if (!canSubmit) return
    onSubmit(name.trim(), color)
  }

  const onEnterSubmit = (e: KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <PickerSheet isOpen={isOpen} title='新規チームを作成' note='名前と色を決めると配置に進みます' onClose={onClose}>
      <div data-team-create-panel='true'>
        <label className={styles.teamNewLabel} htmlFor='team-new-name'>
          チーム名
        </label>
        <input
          id='team-new-name'
          className={styles.assignSearch}
          placeholder='例: チーム E'
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onEnterSubmit}
          autoFocus
        />

        <span className={styles.teamNewLabel}>カラー</span>
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
            className={`${styles.assignSearch} ${styles.teamNewHex}${isHexInvalid ? ` ${styles.isInvalid}` : ''}`}
            aria-label='色コード'
            placeholder='#RRGGBB'
            value={hexText}
            onChange={(e) => onHexChange(e.target.value)}
            onKeyDown={onEnterSubmit}
            spellCheck={false}
          />
        </div>
        {isHexInvalid && <p className={styles.teamNewHexError}>{HEX_FORMAT_ERROR}</p>}

        <div className={styles.teamNewActions}>
          <button type='button' className={`pixel-btn ${styles.teamNewCancel}`} onClick={onClose}>
            キャンセル
          </button>
          <button
            type='button'
            className={`pixel-btn ${styles.teamNewSubmit}`}
            disabled={!canSubmit}
            onClick={submit}
          >
            作成
          </button>
        </div>
      </div>
    </PickerSheet>
  )
}
