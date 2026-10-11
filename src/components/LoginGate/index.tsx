import Image from 'next/image'
import { useRouter } from 'next/router'
import { LoginBackdrop } from './components/LoginBackdrop'
import { LoginForm } from './components/LoginForm'
import { LoginHintContent } from './components/LoginHintContent'
import { useLoginGate } from './hooks/use-login-gate'
import type { LoginGateProps } from './type'

export function LoginGate({ onAuthenticated }: LoginGateProps) {
  // GitHub Pages(basePath 付き)配信でもロゴが404にならないよう router から取る
  const { basePath } = useRouter()
  const gate = useLoginGate({ onAuthenticated })

  return (
    <div
      className='fixed inset-0 flex overflow-y-auto bg-gradient-to-br from-sky-50 via-white to-sky-50 px-5 py-8 lg:to-rose-50 lg:p-8'
      style={{ zIndex: 'var(--z-index-login-gate)' }}
    >
      <LoginBackdrop />

      <div className='m-auto w-full max-w-md lg:relative lg:max-w-4xl'>
        {/* PC だけカード化する。モバイルは背景グラデーションの上に直接置く */}
        <div
          role='main'
          aria-label='グループウェアログイン'
          className='w-full lg:rounded-2xl lg:border lg:border-white/60 lg:bg-white/90 lg:p-8 lg:shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] lg:backdrop-blur-sm'
        >
          <div className='mx-auto w-full lg:flex lg:max-w-none lg:items-stretch lg:justify-center lg:gap-8'>
            <div className='lg:flex lg:w-[26rem] lg:shrink-0 lg:flex-col lg:justify-center'>
              <div className='mb-12 flex flex-col items-center gap-0.5 max-lg:-translate-y-9.25 lg:mb-8 lg:-translate-y-12'>
                <Image
                  src={`${basePath}/logo.svg`}
                  alt='J-Paku Logo'
                  width={150}
                  height={59}
                  priority
                  className='h-auto w-37.5'
                />
                <p className='indent-[0.15em] text-[13px] font-bold tracking-[0.15em] text-slate-900'>
                  社員マップ
                </p>
              </div>

              <p className='mb-4 text-center text-sm text-slate-600'>
                <span className='font-semibold text-[color:var(--color-gate-primary)]'>
                  サイボウズ Garoon{' '}
                </span>
                アカウントでログイン
              </p>

              <LoginForm
                loginId={gate.loginId}
                onLoginIdChange={gate.setLoginId}
                password={gate.password}
                onPasswordChange={gate.setPassword}
                passwordVisible={gate.passwordVisible}
                onTogglePasswordVisible={gate.togglePasswordVisible}
                canSubmit={gate.canSubmit}
                onSubmit={gate.handleSubmit}
              />

              {/* モバイルはガイドを折りたたむ。PC は右カラムの aside に常時出す */}
              <div className='lg:hidden'>
                <div className='mt-2'>
                  <button
                    type='button'
                    aria-expanded={gate.hintOpen}
                    aria-controls='login-hint-body'
                    onClick={gate.toggleHint}
                    className='flex w-full items-center justify-center gap-1 rounded-lg py-2.5 text-sm font-medium text-[color:var(--color-gate-primary)] transition-colors hover:text-[color:var(--color-gate-primary-hover)] focus:outline-none focus-visible:text-[color:var(--color-gate-primary-hover)]'
                  >
                    <span className='icon-msr-filled text-xl' aria-hidden='true'>
                      help
                    </span>
                    ログインでお困りの方
                  </button>
                </div>
                {gate.hintOpen ? (
                  <div id='login-hint-body' className='mt-2'>
                    <LoginHintContent />
                  </div>
                ) : null}
              </div>

              <p className='mt-2 text-center text-[11px] text-slate-400'>© 朴</p>
            </div>

            <div
              aria-hidden='true'
              className='hidden lg:block lg:w-px lg:shrink-0 lg:self-stretch lg:bg-slate-200'
            />

            <aside
              aria-label='ログインでお困りの方'
              className='hidden lg:flex lg:w-96 lg:shrink-0 lg:flex-col lg:justify-center'
            >
              <h2 className='mb-4 text-center text-xl font-semibold tracking-tight text-slate-900'>
                ログインでお困りの方
              </h2>
              <LoginHintContent />
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
