// STEP B5: 選択中の空セルの中央に出す「席追加」ピル。コンテナは pointer-events: none にして
// ボタン以外の領域を素通しし、背後の EmptyGridCell(セル全体を覆うボタン)へタップを届かせる。
// 素通しにしないと、選択中セルの再タップで EmptyGridCell 自身の onClick が発火せず選択解除
// できなくなる。サイズ(通常/コンパクト)は呼び出し側の .team-ovl-grid の種別クラス
// (is-desktop/is-compact)側で決まるため、このコンポーネント自身は種別を知らない
// (EmptyGridCell と同じ方針)

type Props = {
  onAddSeat: () => void
}

export const SeatActionOverlay = ({ onAddSeat }: Props) => (
  <div className='team-ovl-seat-add'>
    <button type='button' className='team-ovl-seat-add-btn' aria-label='席追加' onClick={onAddSeat}>
      <span className='material-symbols-outlined team-ovl-seat-add-icon' aria-hidden='true'>
        add
      </span>
      席追加
    </button>
  </div>
)
