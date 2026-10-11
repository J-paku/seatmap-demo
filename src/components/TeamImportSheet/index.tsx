import { useCallback, useEffect, useMemo, useState } from 'react'
import { OFFICIAL_TEAM_IMPORT_SOURCES } from './utils/team-import-sources'
import styles from './team-import-sheet.module.css'
import { FocusTrap } from '@/components/a11y/components/FocusTrap'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss'
import { normalizeSearchText } from '@/utils/employee-search'
import type { TeamImportSource } from '@/utils/layout/team-import'

// §02-3 既存チームから取り込み。複数選択 + 検索 + 確定だけを持ち、
// 採番・自動配置は utils/layout/team-import、レイアウトへの反映は use-object-placement が担う。
//
// PickerSheet(共通シェル)は使わない。あちらは「1つ選んだら閉じる」形で、寸法も
// max-height: min(80vh, 640px) 固定 — このシートは複数選択のうえ寸法が仕様で決まっている
// (モバイル 95dvh / PC 480×90vh)ので、共通シェルを曲げずに自前のシェルを持つ
//
// DECISION D3: 原典の選択式ミニマップ(高さ200px・ZOOM2.4・0.35sパン・選択タイルstroke)は
// 実装しない。チェックボックス行がその代わりを務める

const COMPACT_QUERY = '(max-width: 639px)'

type Props = {
  isOpen: boolean
  onConfirm: (sources: TeamImportSource[]) => void
  onClose: () => void
}

export const TeamImportSheet = ({ isOpen, onConfirm, onClose }: Props) => {
  const isCompact = useMediaQuery(COMPACT_QUERY)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useBodyScrollLock(isOpen)

  // 閉じ経路(×・背景・Escape・スワイプ・確定)を1本に束ねる。ここで検索語と選択を捨てるので、
  // 次に開いたときに前回の選択が残らない
  const close = useCallback(() => {
    setQuery('')
    setSelectedIds([])
    onClose()
  }, [onClose])

  const { sheetHandlers, dragStyle } = useSwipeToDismiss({
    onDismiss: close,
    enabled: isOpen && isCompact,
  })

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  // 検索の正規化は社員検索と同じ関数を通す(NFKC + 小文字化 + ひらがな→カタカナ)。
  // ここだけ別の正規化を書くと、同じ語で引けたり引けなかったりする
  const visible = useMemo(() => {
    const normalized = normalizeSearchText(query)
    if (normalized.length === 0) return OFFICIAL_TEAM_IMPORT_SOURCES
    return OFFICIAL_TEAM_IMPORT_SOURCES.filter((source) =>
      normalizeSearchText(source.team.name).includes(normalized)
    )
  }, [query])

  const toggle = useCallback((teamId: string) => {
    setSelectedIds((prev) => (prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]))
  }, [])

  // 選択順のまま渡す。配置は選択順に画面中央から外へ広がるので、順序が結果に出る
  const confirm = useCallback(() => {
    const selected = selectedIds
      .map((id) => OFFICIAL_TEAM_IMPORT_SOURCES.find((source) => source.team.id === id))
      .filter((source): source is TeamImportSource => source !== undefined)
    if (selected.length === 0) return
    setQuery('')
    setSelectedIds([])
    onConfirm(selected)
  }, [selectedIds, onConfirm])

  if (!isOpen) return null

  return (
    <div className={styles.wrap} role='presentation'>
      <div className={styles.backdrop} onClick={close} />
      <FocusTrap isActive className={`${styles.panel}${isCompact ? ` ${styles.isCompact}` : ''}`}>
        <div
          className={styles.inner}
          role='dialog'
          aria-modal='true'
          aria-label='チームを取り込み'
          {...sheetHandlers}
          style={{
            // ドラッグ中は指へ追従(transform はフックが直接書き込む)、離指後はここの
            // transition が復帰してスナップバックする
            transform: dragStyle.transform,
            transition: dragStyle.transition,
            willChange: dragStyle.willChange,
          }}
        >
          {isCompact && <span className={styles.grip} aria-hidden='true' />}
          <div className={styles.head}>
            <h2 className={styles.title}>チームを取り込み</h2>
            <button type='button' className={styles.close} aria-label='閉じる' onClick={close}>
              <span className='icon-msr-thin' aria-hidden='true'>
                close
              </span>
            </button>
          </div>
          <div className={styles.searchRow}>
            <input
              type='search'
              className={styles.search}
              placeholder='チーム名で検索'
              aria-label='チーム名で検索'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className={styles.list}>
            {visible.length === 0 ? (
              <p className={styles.empty}>チームが見つかりません</p>
            ) : (
              visible.map((source) => (
                <label key={source.team.id} className={styles.row}>
                  <input
                    type='checkbox'
                    className={styles.check}
                    checked={selectedIds.includes(source.team.id)}
                    onChange={() => toggle(source.team.id)}
                  />
                  {/* チーム色はデザイントークンではなくデータ(mocks の Team.color)なので直接載せる */}
                  <span className={styles.dot} aria-hidden='true' style={{ background: source.team.color }} />
                  <span className={styles.rowName}>{source.team.name}</span>
                  <span className={styles.rowMeta}>{`${source.seats.length}席`}</span>
                </label>
              ))
            )}
          </div>
          <div className={styles.foot}>
            <p className={styles.hint}>選択した部署は画面中央付近にまとめて配置されます</p>
            <button
              type='button'
              className={styles.confirm}
              disabled={selectedIds.length === 0}
              onClick={confirm}
            >
              {`確定 (${selectedIds.length}件)`}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  )
}
