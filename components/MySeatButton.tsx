// 画面左下に固定する「自分の席へ」ボタン(変換レイヤー外)。
// ズーム操作は右下の親指圏に残したいので、モーダルを開くこの操作は反対側へ分ける
type Props = {
  onClick: () => void
}

export const MySeatButton = ({ onClick }: Props) => (
  <button type='button' className='my-seat-button' aria-label='自分の席' onClick={onClick}>
    <span className='icon-msr-filled' aria-hidden='true'>
      person_pin_circle
    </span>
  </button>
)
