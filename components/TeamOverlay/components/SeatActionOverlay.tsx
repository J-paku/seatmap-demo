// STEP B5: 選択中のセル中央に出す操作ピル。コンテナは pointer-events: none にして
// ボタン以外の領域を素通しし、背後の EmptyGridCell/EditSeatCell(セル全体を覆うボタン)へ
// タップを届かせる。素通しにしないと、選択中セルの再タップで背後の onClick が発火せず選択解除
// できなくなる。サイズ(通常/コンパクト)は呼び出し側の .team-ovl-grid の種別クラス
// (is-desktop/is-compact)側で決まるため、このコンポーネント自身は種別を知らない
// (EmptyGridCell/EditSeatCell と同じ方針)

// STEP C1: variant で空セル用/席用を共用する(新しい部品は作らない)。席はさらに社員の
// 有無でラベル・アイコンが変わる(空席は「登録」、在席は「変更」)。追加行為(空セル・空席)は
// add、置き換え(在席)だけ swap_horiz で区別する
type Props =
  | { variant: 'emptyCell'; onAddSeat: () => void }
  | { variant: 'seat'; hasEmployee: boolean; onAssign: () => void }

const resolveContent = (props: Props): { label: string; icon: string } => {
  if (props.variant === 'emptyCell') return { label: '席追加', icon: 'add' }
  return props.hasEmployee ? { label: '変更', icon: 'swap_horiz' } : { label: '登録', icon: 'add' }
}

export const SeatActionOverlay = (props: Props) => {
  const { label, icon } = resolveContent(props)
  const onClick = props.variant === 'emptyCell' ? props.onAddSeat : props.onAssign
  return (
    <div className='team-ovl-seat-add'>
      <button type='button' className='team-ovl-seat-add-btn' aria-label={label} onClick={onClick}>
        <span className='material-symbols-outlined team-ovl-seat-add-icon' aria-hidden='true'>
          {icon}
        </span>
        {label}
      </button>
    </div>
  )
}
