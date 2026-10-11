import { createContext, useContext } from 'react'

// §06-2/§07-2: 座席削除(aria-label='座席を削除')の要求口。呼び出し元はDesktopSeatGrid/
// CompactSeatGrid(TeamOverlay/components/EditSeatCellの担当外)を経由してEditSeatCellを描画するため、
// そこへprops追加を波及させずに済ませるようContext経由で渡す。TeamOverlay/index.tsxがProviderで
// グリッドツリーを包み、EditSeatCellだけがuseSeatDeleteRequestで直接読む
export type SeatDeleteRequestHandler = (seatId: string) => void

const SeatDeleteContext = createContext<SeatDeleteRequestHandler | null>(null)

export const SeatDeleteProvider = SeatDeleteContext.Provider

// Providerで包まれていない(=編集ツリー外)場合はnullを返す。呼び出し側はnullを
// 「削除ボタン自体を出さない」判定に使う(エラーを投げない — 他のcontextsのuseXxxとは異なる)
export const useSeatDeleteRequest = (): SeatDeleteRequestHandler | null => useContext(SeatDeleteContext)
