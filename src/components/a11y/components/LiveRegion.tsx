// スクリーンリーダーへの通知コンポーネント（§6準拠 / CHE 適用）
import { useLiveRegion } from '../hooks/use-live-region'

interface LiveRegionProps {
  message: string
}

export function LiveRegion({ message }: LiveRegionProps) {
  const { ref } = useLiveRegion(message)

  return (
    <div ref={ref} role='status' aria-live='polite' aria-atomic='true' className='sr-only' />
  )
}

// Pages Router の page-without-valid-component 警告回避用ダミー default export
