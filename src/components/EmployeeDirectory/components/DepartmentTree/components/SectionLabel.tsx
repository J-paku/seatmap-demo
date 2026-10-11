// セクション見出しラベル（マイ部署 / 全ての部署）
function SectionLabel({ icon, label }: { icon?: string; label: string }) {
  return (
    <div className='flex items-center gap-1 px-2 pb-1 pt-2'>
      {icon ? (
        <span
          className='icon-msr-filled text-[14px] leading-none'
          aria-hidden='true'
          style={{ color: 'var(--color-accent)' }}
        >
          {icon}
        </span>
      ) : null}
      <span
        className='text-[11px] font-semibold tracking-wide'
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
      </span>
    </div>
  )
}

export { SectionLabel }
