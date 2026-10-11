// フォーカストラップコンポーネント（§2準拠 / CHE 適用）
import { useFocusTrap } from '../hooks/use-focus-trap'

interface FocusTrapProps {
  isActive: boolean
  children: React.ReactNode
  className?: string
}

export function FocusTrap({ isActive, children, className }: FocusTrapProps) {
  const { containerRef } = useFocusTrap(isActive)

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

// Pages Router の page-without-valid-component 警告回避用ダミー default export
