// 画面固定のズーム操作UI(変換レイヤー外)
type Props = {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export const ZoomControls = ({ onZoomIn, onZoomOut, onReset }: Props) => (
  <div className='zoom-controls'>
    <button type='button' aria-label='拡大' onClick={onZoomIn}>
      ＋
    </button>
    <button type='button' aria-label='縮小' onClick={onZoomOut}>
      －
    </button>
    <button type='button' aria-label='リセット' onClick={onReset} style={{ fontSize: 12 }}>
      リセット
    </button>
  </div>
)
