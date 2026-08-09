// ヘッダー: ロゴ・メニューボタンのみ(実物 SeatMapHeader の構成)。
// リセット・編集トグルは §5.4 に従いサイドバーの設定パネルへ移設済み
import Image from 'next/image'
import { useRouter } from 'next/router'
import { triggerHaptic } from '@/utils/haptic'

type Props = {
  onOpenDirectory: () => void
  isDirectoryOpen: boolean
}

export const AppHeader = ({ onOpenDirectory, isDirectoryOpen }: Props) => {
  // ロゴパス — 原文の NEXT_PUBLIC_DEPLOY_PATH 分岐はデモの basePath 解決へ置き換える(§4)
  const { basePath } = useRouter()

  return (
    // デモのキャンバスは position:absolute inset:0 で全面を覆うため、
    // 旧 .app-header と同じ積み重ね(--z-index-sticky)を与えないとヘッダーがクリックを受けられない
    <div className='flex-none relative' style={{ zIndex: 'var(--z-index-sticky)' }}>
      <header
        className='border-b flex items-center gap-3 px-4 py-1.5 transition-colors duration-200'
        style={{
          background: 'var(--color-surface)',
          borderBottomColor: 'var(--color-border)',
          paddingLeft: 'calc(env(safe-area-inset-left) + 1rem)',
          paddingRight: 'calc(env(safe-area-inset-right) + 1rem)',
        }}
      >
        {/* ロゴ — ポートフォリオハブ(J-Paku)へ遷移する */}
        <a
          href='https://j-paku.github.io/'
          aria-label='J-Paku ポートフォリオへ移動'
          onClick={() => {
            triggerHaptic('light')
          }}
          className='flex items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] -ml-1'
        >
          {/*
            テーマで2種を出し分け(.seat-map-root の .dark クラスに Tailwind dark: 追従)。
            タイトなヘッダー高で大きく見えるため幅86pxへ縮小・block でベースライン余白解消。
          */}
          <Image
            width={86}
            height={86}
            src={`${basePath}/logo.svg`}
            alt='J-Paku Logo'
            priority
            className='block w-[86px] h-auto dark:hidden'
          />
          <Image
            width={86}
            height={86}
            src={`${basePath}/logo-dark.svg`}
            alt='J-Paku Logo'
            priority
            className='hidden w-[86px] h-auto dark:block'
          />
        </a>

        <div className='flex-1 min-w-0' />

        {/* メニューボタン — サイドバー開閉中で配色が変わる(44x44) */}
        <button
          type='button'
          aria-label='メニュー'
          aria-expanded={isDirectoryOpen}
          onClick={() => {
            triggerHaptic('light')
            onOpenDirectory()
          }}
          className='flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]'
          style={{
            width: 44,
            height: 44,
            background: isDirectoryOpen ? 'var(--color-accent-soft)' : 'var(--color-surface-muted)',
            color: isDirectoryOpen ? 'var(--color-accent)' : 'var(--color-text-muted)',
          }}
        >
          <span className='icon-msr-filled text-xl' aria-hidden='true'>
            menu
          </span>
        </button>
      </header>
    </div>
  )
}
