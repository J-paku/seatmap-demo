// home ビュー: 主要 CTA (作る) + 控えめなインポート導線
import { triggerHaptic } from '@/lib/haptic'
import {
  AI_BADGE_STYLE,
  AI_BADGE_TEXT_STYLE,
  LAUNCHER_STYLE,
  PRIMARY_CTA_STYLE,
  SECONDARY_LINK_STYLE,
} from '../styles'

interface LauncherViewProps {
  onOpenCompose: () => void
  onOpenImport: () => void
}

export function LauncherView({ onOpenCompose, onOpenImport }: LauncherViewProps) {
  return (
    <div style={LAUNCHER_STYLE}>
      <button
        type='button'
        style={PRIMARY_CTA_STYLE}
        onClick={() => {
          triggerHaptic('medium')
          onOpenCompose()
        }}
      >
        <span style={AI_BADGE_STYLE}>
          <span style={AI_BADGE_TEXT_STYLE}>AI</span>
        </span>
        キャラを作る（Beta）
      </button>

      <button
        type='button'
        style={SECONDARY_LINK_STYLE}
        onClick={() => {
          triggerHaptic('light')
          onOpenImport()
        }}
      >
        <span className='icon-msr-filled' style={{ fontSize: 16 }}>
          content_paste
        </span>
        生成AIの返答を取り込む
        <span className='icon-msr-filled' style={{ fontSize: 16 }}>
          chevron_right
        </span>
      </button>
    </div>
  )
}

export default function _Page() {
  return null
}
