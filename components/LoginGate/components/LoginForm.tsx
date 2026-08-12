interface LoginFormProps {
  loginId: string
  onLoginIdChange: (value: string) => void
  password: string
  onPasswordChange: (value: string) => void
  passwordVisible: boolean
  onTogglePasswordVisible: () => void
  canSubmit: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

export function LoginForm({
  loginId,
  onLoginIdChange,
  password,
  onPasswordChange,
  passwordVisible,
  onTogglePasswordVisible,
  canSubmit,
  onSubmit,
}: LoginFormProps) {
  return (
    <form className='space-y-5' onSubmit={onSubmit}>
      <div>
        <div className='mb-1.5 flex items-center justify-between'>
          <label
            htmlFor='gate-garoon-username'
            className='text-xs font-bold tracking-wide text-slate-600'
          >
            ユーザーID
          </label>
        </div>
        {/* text-[16px] は iOS Safari の自動ズーム回避。16px 未満にすると focus で画面が拡大する */}
        <input
          id='gate-garoon-username'
          type='text'
          autoComplete='username'
          autoCapitalize='none'
          autoCorrect='off'
          spellCheck={false}
          placeholder='サイボウズ ID'
          value={loginId}
          onChange={(event) => {
            onLoginIdChange(event.target.value)
          }}
          className='h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] text-slate-900 transition-shadow placeholder:text-slate-400 focus:border-[color:var(--color-gate-primary)] focus:outline-none focus:ring-4 focus:ring-[color:var(--color-gate-primary-ring)] disabled:bg-slate-50 disabled:text-slate-400'
        />
      </div>

      <div>
        <div className='mb-1.5 flex items-center justify-between'>
          <label
            htmlFor='gate-garoon-password'
            className='text-xs font-bold tracking-wide text-slate-600'
          >
            パスワード
          </label>
        </div>
        <div className='relative'>
          <input
            id='gate-garoon-password'
            type={passwordVisible ? 'text' : 'password'}
            autoComplete='current-password'
            placeholder='サイボウズ PW'
            value={password}
            onChange={(event) => {
              onPasswordChange(event.target.value)
            }}
            className='h-11 w-full rounded-lg border border-slate-300 bg-white pl-3 pr-11 text-[16px] text-slate-900 transition-shadow placeholder:text-slate-400 focus:border-[color:var(--color-gate-primary)] focus:outline-none focus:ring-4 focus:ring-[color:var(--color-gate-primary-ring)] disabled:bg-slate-50 disabled:text-slate-400'
          />
          <button
            type='button'
            aria-label={passwordVisible ? 'パスワードを隠す' : 'パスワードを表示'}
            aria-pressed={passwordVisible}
            onClick={onTogglePasswordVisible}
            className='absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-[color:var(--color-gate-primary)] focus:outline-none focus-visible:text-[color:var(--color-gate-primary)] disabled:opacity-50'
          >
            <span className='icon-msr-filled text-2xl' aria-hidden='true'>
              {passwordVisible ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
      </div>

      <button
        type='submit'
        disabled={!canSubmit}
        className='mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--color-gate-primary)] text-base font-semibold text-white shadow-lg shadow-[color:var(--color-gate-primary-shadow)] transition-colors hover:bg-[color:var(--color-gate-primary-hover)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--color-gate-primary-ring-strong)] disabled:cursor-not-allowed disabled:opacity-60'
      >
        ログイン
      </button>
    </form>
  )
}
