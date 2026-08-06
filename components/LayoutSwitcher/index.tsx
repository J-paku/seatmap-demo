import { useId } from 'react'
import { useLayoutSwitcher } from './hooks/use-layout-switcher'
import { IslandToggleButton } from './components/IslandToggleButton'
import { OfficialLayoutButton } from './components/OfficialLayoutButton'
import { CustomLayoutList } from './components/CustomLayoutList'
import { CreateLayoutForm } from './components/CreateLayoutForm'
import { useLayoutSource } from '@/contexts/layout-source-context'

// STEP5がデフォルト設定・削除の実処理を実装するまでの仮の口。ここではpropsの型を満たすだけで何もしない
const handleToggleDefault = () => {}
const handleDelete = () => {}

// Dynamic Island風のレイアウト切り替えアイランド。外殻とmorphに加え、展開パネルの中身
// (公式ボタン・カスタム一覧・作成フォーム)を組み立てる
export const LayoutSwitcher = () => {
  const { source } = useLayoutSource()
  const {
    isOpen,
    layoutMetas,
    defaultLayoutId,
    rootRef,
    toggle,
    selectOfficial,
    selectCustom,
    createLayout,
  } = useLayoutSwitcher()
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
          <OfficialLayoutButton isSelected={source.type === 'official'} onSelect={selectOfficial} />
          <CustomLayoutList
            layoutMetas={layoutMetas}
            source={source}
            defaultLayoutId={defaultLayoutId}
            onSelect={selectCustom}
            onToggleDefault={handleToggleDefault}
            onDelete={handleDelete}
          />
          <CreateLayoutForm layoutCount={layoutMetas.length} onCreate={createLayout} />
        </div>
      </div>
    </div>
  )
}
