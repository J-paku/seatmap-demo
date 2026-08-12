import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './facility-picker-modal.module.css'
import { FocusTrap } from '@/components/a11y/components/FocusTrap'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { GAROON_FACILITY_MASTER } from '@/lib/garoon-facilities'
import type { GaroonFacility } from '@/lib/garoon-facilities'
import { normalizeSearchText } from '@/utils/employee-search'
import { triggerHaptic } from '@/utils/haptic'

// §03-3 施設ピッカー(Garoon会議室)。中央モーダル w-[380px] max-h-[80vh] 固定。
//
// PickerSheet(共通シェル)は使わない。あちらは 640px 未満でボトムシートへ化けるが、
// 原典の施設ピッカーは中央モーダルで寸法まで決まっている(TeamCategorySheet と同じ理由)。
//
// 一覧は五十音ソート。鍵は表記ではなくマスタの読み(kana) — 漢字表記を Intl.Collator へ
// そのまま渡すと部首・画数順になり、五十音にならない
const KANA_COLLATOR = new Intl.Collator('ja')

// 同音のときだけ表記で決める。決まらないままだと実行環境で並びが揺れる
const byKana = (a: GaroonFacility, b: GaroonFacility): number =>
  KANA_COLLATOR.compare(a.kana, b.kana) || KANA_COLLATOR.compare(a.name, b.name)

type Props = {
  isOpen: boolean
  // 現在のレイアウトに既に置かれている施設ID(Facility.facilityId)。配置済み判定の材料
  placedFacilityIds: readonly string[]
  onSelect: (facility: GaroonFacility) => void
  onClose: () => void
}

export const FacilityPickerModal = ({ isOpen, placedFacilityIds, onSelect, onClose }: Props) => {
  const [query, setQuery] = useState('')

  useBodyScrollLock(isOpen)

  // 閉じ経路(×・背景・Escape・選択)を1本に束ねる。ここで検索語を捨てるので次に開いた時に残らない
  const close = useCallback(() => {
    setQuery('')
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  const sorted = useMemo(() => [...GAROON_FACILITY_MASTER].sort(byKana), [])

  // 検索の正規化は社員検索と同じ関数を通す(NFKC + 小文字化 + ひらがな→カタカナ)
  const visible = useMemo(() => {
    const normalized = normalizeSearchText(query)
    if (normalized.length === 0) return sorted
    return sorted.filter((facility) => normalizeSearchText(facility.name).includes(normalized))
  }, [sorted, query])

  const placed = useMemo(() => new Set(placedFacilityIds), [placedFacilityIds])

  const handleSelect = useCallback(
    (facility: GaroonFacility) => {
      triggerHaptic('medium')
      setQuery('')
      onSelect(facility)
    },
    [onSelect]
  )

  if (!isOpen) return null

  return (
    <div className={styles.wrap} role='presentation'>
      <div className={styles.backdrop} onClick={close} />
      <FocusTrap isActive className={styles.panel}>
        <div className={styles.inner} role='dialog' aria-modal='true' aria-label='施設を選択'>
          <div className={styles.head}>
            <h2 className={styles.title}>施設を選択</h2>
            <button type='button' className={styles.close} aria-label='閉じる' onClick={close}>
              <span className='icon-msr-thin' aria-hidden='true'>
                close
              </span>
            </button>
          </div>
          <p className={styles.note}>Garoon登録済みの施設を配置します</p>
          <div className={styles.searchRow}>
            <input
              type='search'
              className={styles.search}
              placeholder='施設名で検索...'
              aria-label='施設名で検索'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className={styles.list}>
            {sorted.length === 0 && <p className={styles.empty}>施設が登録されていません</p>}
            {sorted.length > 0 && visible.length === 0 && <p className={styles.empty}>施設が見つかりません</p>}
            {visible.map((facility) => {
              const isPlaced = placed.has(facility.facilityId)
              return (
                <button
                  key={facility.facilityId}
                  type='button'
                  className={styles.row}
                  disabled={isPlaced}
                  // 配置済みの行だけ全角括弧つきの読み上げ名を持つ(§03-3)
                  aria-label={isPlaced ? `${facility.name}（配置済み）` : undefined}
                  onClick={() => handleSelect(facility)}
                >
                  <span className={`icon-msr-thin ${styles.rowIcon}`} aria-hidden='true'>
                    meeting_room
                  </span>
                  <span className={styles.rowName}>{facility.name}</span>
                  {isPlaced && <span className={styles.pill}>配置済み</span>}
                </button>
              )
            })}
          </div>
        </div>
      </FocusTrap>
    </div>
  )
}
