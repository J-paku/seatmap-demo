import { useId } from 'react'
import { useLayoutSwitcher } from './hooks/use-layout-switcher'
import { IslandToggleButton } from './components/IslandToggleButton'
import { useLayoutSource } from '@/contexts/layout-source-context'

// Dynamic Island風のレイアウト切り替えアイランド。この段は外殻とmorphのみを持ち、
// 展開パネルの中身(公式ボタン・一覧行・作成フォーム)はSTEP4が担当するため
// ここでは空のプレースホルダを描く
export const LayoutSwitcher = () => {
  const { source } = useLayoutSource()
  const { isOpen, layoutMetas, rootRef, toggle } = useLayoutSwitcher()
  const panelId = useId()

  return (
    <div
      ref={rootRef}
      className={`layout-switcher${isOpen ? ' is-open' : ''}`}
      role='region'
      aria-label='レイアウト切り替え'
      data-coach='layout-switcher'
    >
      <IslandToggleButton
        source={source}
        layoutMetas={layoutMetas}
        isOpen={isOpen}
        panelId={panelId}
        onToggle={toggle}
      />
      {/* 折りたたみ中はinertでキーボード・スクリーンリーダーの侵入を止める。
          display:noneにしないのはmorphのトランジションを効かせ続けるため */}
      <div className='layout-switcher-panel' id={panelId} inert={!isOpen}>
        <div className='layout-switcher-panel-inner'>
          {/* STEP4: 公式ボタン・一覧行・作成フォームをここに実装する */}
        </div>
      </div>
    </div>
  )
}
