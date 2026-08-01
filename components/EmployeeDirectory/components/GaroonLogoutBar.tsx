// 設定パネル右下のGaroonログアウト導線 — 右寄せ + 確認モーダル
import { useState, useCallback } from 'react'
import { SeatMapPortal } from '@/components/SeatMapPortal'
import { FocusTrap } from '@/components/a11y/components/FocusTrap'
import { triggerHaptic } from '@/lib/haptic'

interface GaroonLogoutBarProps {
  isGaroonConnected?: boolean
  onGaroonLogout?: () => void
  isDark: boolean
}

export function GaroonLogoutBar({
  isGaroonConnected,
  onGaroonLogout,
  isDark,
}: GaroonLogoutBarProps) {
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)

  const handleLogoutClick = useCallback(() => {
    triggerHaptic('light')
    setIsLogoutConfirmOpen(true)
  }, [])

  const handleLogoutConfirm = useCallback(() => {
    triggerHaptic('medium')
    setIsLogoutConfirmOpen(false)
    onGaroonLogout?.()
  }, [onGaroonLogout])

  const handleLogoutCancel = useCallback(() => {
    triggerHaptic('light')
    setIsLogoutConfirmOpen(false)
  }, [])

  // Garoon未連携時は導線を出さない
  if (!isGaroonConnected) {
    return null
  }

  return (
    <>
      {/* パネル右下: ログアウトを右寄せのコンパクトボタンで配置 */}
      <div
        className='flex shrink-0 items-center justify-end px-3 py-1.5'
        style={{
          backgroundColor: isDark ? '#1F2230' : '#FFFFFF',
        }}
      >
        <button
          type='button'
          onClick={handleLogoutClick}
          className='flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500'
        >
          <span className='icon-msr-filled text-base' aria-hidden='true'>
            logout
          </span>
          <span>Garoonログアウト</span>
        </button>
      </div>

      {/* ログアウト確認モーダル: transform 親に依存しないよう body へポータル */}
      {isLogoutConfirmOpen && (
        <SeatMapPortal>
          <div
            className='fixed inset-0 z-[1100] flex items-center justify-center bg-black/50'
            onClick={e => {
              if (e.target === e.currentTarget) handleLogoutCancel()
            }}
            role='presentation'
          >
            <FocusTrap isActive={isLogoutConfirmOpen}>
              <div
                role='dialog'
                aria-modal='true'
                aria-label='Garoonログアウト確認'
                className='w-[90vw] max-w-sm rounded-2xl shadow-2xl overflow-hidden'
                style={{ backgroundColor: isDark ? '#1F2230' : '#FFFFFF' }}
              >
                {/* アイコン + タイトル + 説明 */}
                <div className='flex flex-col items-center px-6 pt-6 pb-5 gap-2'>
                  <span
                    className='flex items-center justify-center w-12 h-12 rounded-full mb-1'
                    style={{ backgroundColor: isDark ? '#3B1F1F' : '#FEF2F2' }}
                  >
                    <span className='icon-msr-filled text-2xl text-red-500' aria-hidden='true'>
                      logout
                    </span>
                  </span>
                  <h2
                    className='text-base font-bold'
                    style={{ color: isDark ? '#F8F8F2' : '#1A1A1A' }}
                  >
                    Garoonログアウト
                  </h2>
                  <p
                    className='text-sm text-center leading-relaxed'
                    style={{ color: isDark ? '#B8C0DD' : '#6B7280' }}
                  >
                    Garoon連携を解除しますか？
                  </p>
                </div>

                {/* キャンセル / ログアウトボタン */}
                <div
                  className='flex gap-2 px-5 pt-4 pb-5'
                  style={{ borderTop: `1px solid ${isDark ? '#374151' : '#E5E7EB'}` }}
                >
                  <button
                    type='button'
                    onClick={handleLogoutCancel}
                    className='flex-1 h-10 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                    style={{
                      backgroundColor: isDark ? '#374151' : '#F3F4F6',
                      color: isDark ? '#F8F8F2' : '#1A1A1A',
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    type='button'
                    onClick={handleLogoutConfirm}
                    className='flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2'
                  >
                    ログアウト
                  </button>
                </div>
              </div>
            </FocusTrap>
          </div>
        </SeatMapPortal>
      )}
    </>
  )
}
