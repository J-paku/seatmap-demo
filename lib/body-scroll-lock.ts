// モーダル/シートのスクロール制御を集約するロック機構（参照カウント + オーバーフロー状態の復元）

let lockCount = 0
let originalOverflow: string | null = null

export const lockBodyScroll = (): void => {
  if (typeof document === 'undefined') return

  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

export const unlockBodyScroll = (): void => {
  if (typeof document === 'undefined') return

  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0 && originalOverflow !== null) {
    document.body.style.overflow = originalOverflow
    originalOverflow = null
  }
}
