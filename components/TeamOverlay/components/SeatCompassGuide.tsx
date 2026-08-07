// STEP D2: 回転グリップをドラッグしている間だけ出す方角ガイド。カード中心を基準に
// 東西南北の目安を薄く示し、ドラッグが終わればアンマウントされて消える(常時出すと
// グリッドが読めなくなるため)。装飾のみなのでaria-hidden、向きの文字情報は
// EditSeatCellのaria-labelが持つ
export const SeatCompassGuide = () => (
  <span className='team-ovl-compass-guide' aria-hidden='true'>
    <span className='team-ovl-compass-tick is-north' />
    <span className='team-ovl-compass-tick is-east' />
    <span className='team-ovl-compass-tick is-south' />
    <span className='team-ovl-compass-tick is-west' />
  </span>
)
