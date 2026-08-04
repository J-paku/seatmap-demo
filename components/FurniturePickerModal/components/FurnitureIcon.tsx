import type { FurnitureKind } from '@/types'

// 家具の簡易アイコン。24 viewBox の線画で、種別が見分けられる最小限の形だけを描く

const PATHS: Record<FurnitureKind, string> = {
  wall: 'M2 9h20v6H2z M7 9v6 M12 9v6 M17 9v6',
  column: 'M8 3h8v18H8z M8 7h8 M8 17h8',
  stairs: 'M3 20h5v-5h5v-5h5V5 M3 20V9',
  door: 'M6 3h12v18H6z M15 12h1.5',
  window: 'M3 5h18v14H3z M12 5v14 M3 12h18',
  sofa: 'M3 11a2 2 0 0 1 4 0v4h10v-4a2 2 0 0 1 4 0v7H3z M7 15h10',
  table: 'M2 9h20v3H2z M5 12v8 M19 12v8',
  shelf: 'M4 3h16v18H4z M4 9h16 M4 15h16',
  plant: 'M12 21v-8 M12 13c-4 0-5-3-5-6 3 0 5 2 5 6 0-4 2-6 5-6 0 3-1 6-5 6 M9 21h6',
  bed: 'M3 18V8h13a5 5 0 0 1 5 5v5 M3 13h18 M6 10h5',
}

type Props = { kind: FurnitureKind }

export const FurnitureIcon = ({ kind }: Props) => (
  <svg viewBox='0 0 24 24' width='24' height='24' aria-hidden='true' className='furn-pick-icon'>
    <path
      d={PATHS[kind]}
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)
