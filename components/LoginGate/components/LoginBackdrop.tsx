// 背景のぼかし円。モバイルでは1つだけ出し、PC で残り2つを足す(原本と同じ出し分け)
export function LoginBackdrop() {
  return (
    <div aria-hidden='true' className='pointer-events-none absolute inset-0 overflow-hidden'>
      <div className='absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[color:var(--color-gate-blob-sky-wash)] blur-3xl' />
      <div className='absolute -bottom-32 -right-16 hidden h-80 w-80 rounded-full bg-[color:var(--color-gate-blob-rose-wash)] blur-3xl lg:block' />
      <div className='absolute right-1/4 top-1/3 hidden h-40 w-40 rounded-full bg-[color:var(--color-gate-blob-amber-wash)] blur-3xl lg:block' />
    </div>
  )
}
