// 参加者ポップオーバーの配置状態。座標はアンカー(参加者ボタン)の実測から毎回作り直す
export type AttendeePopoverState = {
  meetingId: string
  top: number
  right: number
  flipped: boolean
  availableHeight: number
  maxWidthPx: number
  isSticky: boolean
}

// 参加者ボタンの操作を親のフックへ届けるハンドラ束。Section→Card→Row と受け渡す
export type AttendeeHandlers = {
  onEnter: (meetingId: string, anchor: HTMLElement) => void
  onLeave: () => void
  onToggle: (meetingId: string, anchor: HTMLElement) => void
}
