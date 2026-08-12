import { LoginGuideSheet } from './LoginGuideSheet'

// 「ログインでお困りの方」の中身。PC は右カラムの aside、モバイルは折りたたみの中に
// 同じものを出す。2箇所が別々に育つと片方だけ古くなるので本文はここ1つに寄せる
export function LoginHintContent() {
  return (
    <div className='space-y-4 rounded-xl border border-sky-100 bg-sky-50 px-3 py-4 text-slate-600'>
      <span className='inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-gate-primary-badge)] px-3 py-1.5 text-[13px] font-bold text-[color:var(--color-gate-primary)]'>
        ログインガイド
      </span>
      <h3 className='text-[14px] font-semibold leading-snug tracking-tight text-slate-900'>
        サイボウズのアカウントでログインします
      </h3>
      <ol className='space-y-3 pl-3'>
        <li className='flex items-start gap-2.5'>
          <span className='mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-gate-primary)] text-xs font-extrabold text-white'>
            1
          </span>
          <span className='text-[14px] font-medium leading-relaxed text-slate-800'>
            紙
            <code className='mx-0.5 rounded bg-slate-100 py-0.5 pl-1 font-mono text-[0.85em] text-slate-800'>
              ID・初期パスワードのご案内
            </code>
            を用意
          </span>
        </li>
        <li className='flex items-start gap-2.5'>
          <span className='mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-gate-primary)] text-xs font-extrabold text-white'>
            2
          </span>
          <span className='text-[13px] font-medium leading-relaxed text-slate-800'>
            <b
              className='font-bold text-[color:var(--color-gate-danger)]'
              style={{
                background:
                  'linear-gradient(transparent 55%, var(--color-gate-marker-danger) 55%)',
              }}
            >
              サイボウズ
            </b>
            の欄のID・パスワードを確認
          </span>
        </li>
        <li className='flex items-start gap-2.5'>
          <span className='mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-gate-primary)] text-xs font-extrabold text-white'>
            3
          </span>
          <span className='text-[13px] font-medium leading-relaxed text-slate-800'>
            そのID・パスワードでログイン
          </span>
        </li>
      </ol>

      {/* 見本の該当欄へ視線を送る導線。押せる要素ではないので装飾として置く */}
      <div className='flex flex-col items-center gap-1 border-t border-slate-200 pt-4'>
        <span className='inline-flex items-center gap-1.5 px-3.5 text-[12px] font-bold text-[color:var(--color-gate-primary)]'>
          サイボウズの欄はこちら
          <span className='relative inline-flex'>
            <span
              aria-hidden='true'
              className='absolute inset-0 animate-ping rounded-full bg-[color:var(--color-gate-primary-ring-strong)]'
            />
            <span
              aria-hidden='true'
              className='icon-msr-filled relative flex items-center justify-center text-base'
            >
              error
            </span>
          </span>
        </span>
        <span
          aria-hidden='true'
          className='icon-msr-filled animate-bounce text-lg text-[color:var(--color-gate-primary-faint)]'
        >
          keyboard_arrow_down
        </span>
      </div>

      <div className='-mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-sm'>
        <LoginGuideSheet />
      </div>

      <p className='flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-3 text-[13px] font-bold text-[color:var(--color-gate-alert)]'>
        <span className='icon-msr-filled text-base' aria-hidden='true'>
          error
        </span>
        <span>
          <span
            className='font-bold text-slate-700'
            style={{
              background:
                'linear-gradient(transparent 55%, var(--color-gate-marker-neutral) 55%)',
            }}
          >
            PCログイン
          </span>
          とは別のIDです
        </span>
      </p>
      <p className='border-t border-sky-100 pt-3 text-center text-[13px] font-medium text-slate-700'>
        お手元に無い・ご不明な場合は
        <br />
        <span className='text-[15px] font-extrabold text-[color:var(--color-gate-primary)]'>
          朴
        </span>
        まで
      </p>
    </div>
  )
}
