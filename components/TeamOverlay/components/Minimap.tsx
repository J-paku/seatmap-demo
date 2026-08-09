import { memo, useId } from 'react'
import { MinimapFigure } from './MinimapFigure'
import { useMinimapCollapse } from '../hooks/use-minimap-collapse'
import { useMinimapData } from '../hooks/use-minimap-data'
import type { MinimapArea, MinimapFurniture } from '../type'
import styles from '../team-overlay-modal.module.css'

// オーバーレイ本文の折りたたみ式ミニマップ。座席グリッドの下に置く表示専用セクション。
// 画面隅に常駐するナビゲーション用ミニマップではないのでタップしても移動しない

type Props = {
  areas: MinimapArea[]
  furniture: MinimapFurniture[]
  currentArea: MinimapArea | null
  viewBox?: { width: number; height: number }
  teamName: string
}

const MinimapSection = ({ areas, furniture, currentArea, viewBox, teamName }: Props) => {
  const data = useMinimapData({ areas, furniture, currentArea, viewBox })
  const { isOpen, toggle } = useMinimapCollapse()
  const panelId = useId()

  if (!data.hasContent) return null

  return (
    <section className={styles.mini} aria-label='ミニマップ'>
      <button
        type='button'
        className={styles.miniToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className={`icon-msr-filled ${styles.miniToggleIcon}`} aria-hidden='true'>
          map
        </span>
        <span className={styles.miniToggleTitle}>ミニマップ</span>
        <span className={`icon-msr-filled ${styles.miniToggleCaret}`} aria-hidden='true'>
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      <div id={panelId}>
        {/* 閉じている間は中身の DOM を作らない(display:none ではなく非描画) */}
        {isOpen && (
          <>
            {/* 図形群は aria-hidden なので、代替としてこの1文だけを読ませる */}
            <p className='sr-only'>{teamName}のフロア内の位置を示す図です</p>
            <MinimapFigure data={data} currentIdPrefix={currentArea?.idPrefix ?? ''} />
          </>
        )}
      </div>
    </section>
  )
}

// オーバーレイ側のスクロール・ハイライト状態の更新で描き直さない
export const Minimap = memo(MinimapSection)
