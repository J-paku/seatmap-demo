import { isColEmpty, isRowEmpty } from '@/utils/layout/seat-grid-draft'
import type { SeatGridDraft } from '@/utils/layout/seat-grid-draft'
import styles from '../team-overlay-modal.module.css'

// STEP B4: グリッド編集の行・列増減UI。編集中のみ呼び出し側(Compact/DesktopSeatGrid)が描画する
//
// - GridEdgeAddButtons: グリッド全体の4辺に1個ずつ置く＋ボタン。呼び出し側のstyles.gridwrap
//   (position: relative)を基準に絶対配置し、内部スクロールに関わらずグリッドの外周に留まる
// - GridRemoveHeaders: 空行・空列のヘッダにだけ出す削除ボタン。呼び出し側のCSS Grid
//   (styles.gridInner)へそのまま埋め込む子要素として返す。ヘッダー行・列トラック
//   (GRID_HEADER_TRACK_PX)ぶん、呼び出し側は既存セルのgridRow/gridColumnを+1オフセットする

// ヘッダー行・列トラックの一辺(px)。呼び出し側のgridTemplateColumns/gridTemplateRowsと1箇所で揃える
export const GRID_HEADER_TRACK_PX = 24

type EdgeAddProps = {
  onAddRow: (edge: 'top' | 'bottom') => void
  onAddCol: (edge: 'left' | 'right') => void
}

export const GridEdgeAddButtons = ({ onAddRow, onAddCol }: EdgeAddProps) => (
  <>
    <button
      type='button'
      className={`${styles.edgeAdd} ${styles.isTop}`}
      aria-label='上に行を追加'
      onClick={() => onAddRow('top')}
    >
      <span className='material-symbols-outlined' aria-hidden='true'>
        add
      </span>
    </button>
    <button
      type='button'
      className={`${styles.edgeAdd} ${styles.isBottom}`}
      aria-label='下に行を追加'
      onClick={() => onAddRow('bottom')}
    >
      <span className='material-symbols-outlined' aria-hidden='true'>
        add
      </span>
    </button>
    <button
      type='button'
      className={`${styles.edgeAdd} ${styles.isLeft}`}
      aria-label='左に列を追加'
      onClick={() => onAddCol('left')}
    >
      <span className='material-symbols-outlined' aria-hidden='true'>
        add
      </span>
    </button>
    <button
      type='button'
      className={`${styles.edgeAdd} ${styles.isRight}`}
      aria-label='右に列を追加'
      onClick={() => onAddCol('right')}
    >
      <span className='material-symbols-outlined' aria-hidden='true'>
        add
      </span>
    </button>
  </>
)

type RemoveHeadersProps = {
  grid: SeatGridDraft
  onRemoveRow: (row: number) => void
  onRemoveCol: (col: number) => void
}

// 空行・空列のヘッダにだけ削除ボタンを出す。行ヘッダはヘッダー列(gridColumn: 1)、
// 列ヘッダはヘッダー行(gridRow: 1)に置く。row/col+2は「1始まりの行番号+ヘッダートラック1本ぶん」
export const GridRemoveHeaders = ({ grid, onRemoveRow, onRemoveCol }: RemoveHeadersProps) => {
  const rows = grid.cells.length
  const cols = grid.cells[0]?.length ?? 0
  return (
    <>
      {Array.from({ length: rows }, (_, row) => row)
        .filter((row) => isRowEmpty(grid, row))
        .map((row) => (
          <div key={`row-header-${row}`} className={styles.gridHeader} style={{ gridRow: row + 2, gridColumn: 1 }}>
            <button
              type='button'
              className={styles.edgeRemove}
              aria-label='この行を削除'
              onClick={() => onRemoveRow(row)}
            >
              <span className='material-symbols-outlined' aria-hidden='true'>
                delete
              </span>
            </button>
          </div>
        ))}
      {Array.from({ length: cols }, (_, col) => col)
        .filter((col) => isColEmpty(grid, col))
        .map((col) => (
          <div key={`col-header-${col}`} className={styles.gridHeader} style={{ gridRow: 1, gridColumn: col + 2 }}>
            <button
              type='button'
              className={styles.edgeRemove}
              aria-label='この列を削除'
              onClick={() => onRemoveCol(col)}
            >
              <span className='material-symbols-outlined' aria-hidden='true'>
                delete
              </span>
            </button>
          </div>
        ))}
    </>
  )
}
