// 画面固定のリモコン(変換レイヤー外)。拡大・縮小・自席・リセットを右下の1本にまとめる
import { triggerHaptic } from '@/lib/haptic'

type Props = {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  // 編集モードではオーバーレイが出ないため渡さない。未指定なら自席ボタンを描かない
  onGoToMySeat?: () => void
}

export const ZoomControls = ({ onZoomIn, onZoomOut, onReset, onGoToMySeat }: Props) => (
  <div className='zoom-controls' role='group' aria-label='ズームコントロール'>
    <button
      type='button'
      aria-label='拡大'
      onClick={() => {
        triggerHaptic('light')
        onZoomIn()
      }}
    >
      ＋
    </button>
    <button
      type='button'
      aria-label='縮小'
      onClick={() => {
        triggerHaptic('light')
        onZoomOut()
      }}
    >
      －
    </button>
    {/* 下段だけ横2連にする。4段の縦積みは親指の届く高さを超え、モバイルで縦幅を食う */}
    <div className='zoom-controls-row'>
      {onGoToMySeat && (
        <button
          type='button'
          aria-label='自席へ移動'
          onClick={() => {
            triggerHaptic('light')
            onGoToMySeat()
          }}
        >
          <span className='material-symbols-outlined' aria-hidden='true'>
            my_location
          </span>
        </button>
      )}
      <button
        type='button'
        aria-label='ズームをリセット'
        onClick={() => {
          triggerHaptic('light')
          onReset()
        }}
      >
        <span className='material-symbols-outlined' aria-hidden='true'>
          refresh
        </span>
      </button>
    </div>
  </div>
)
