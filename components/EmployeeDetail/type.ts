// コピー対象になる連絡先の種別
export type ContactField = 'email' | 'phone'

// 座席から来た時は seatId、人から来た時は employeeId のどちらか一方が入る
export type EmployeeDetailProps = {
  seatId: string | null
  employeeId: string | null
  // 座席へ移動できる時だけ渡す。未指定ならCTAを描かない
  onGoToSeat?: () => void
  // CTAの位置に「座席未設定」を出すかどうか
  showSeatUnsetNotice?: boolean
}
