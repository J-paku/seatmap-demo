import { useEffect, useId } from 'react'
import { useLayoutSwitcher } from './hooks/use-layout-switcher'
import { IslandToggleButton } from './components/IslandToggleButton'
import { OfficialLayoutButton } from './components/OfficialLayoutButton'
import { CustomLayoutList } from './components/CustomLayoutList'
import { CreateLayoutForm } from './components/CreateLayoutForm'
import { LayoutDeleteConfirmDialog } from './components/LayoutDeleteConfirmDialog'
import { useLayoutSource } from '@/contexts/layout-source-context'
import { FLOORS } from '@/utils/floors'
import styles from './layout-switcher.module.css'

type LayoutSwitcherProps = {
  // 展開/折りたたみの状態を親へ伝える。左下FABの表示制御に使う
  onExpandedChange?: (isExpanded: boolean) => void
}

// Dynamic Island風のレイアウト切り替えアイランド。外殻とmorphに加え、展開パネルの中身
// (公式ボタン・カスタム一覧・作成フォーム)を組み立てる
export const LayoutSwitcher = ({ onExpandedChange }: LayoutSwitcherProps = {}) => {
  const { source } = useLayoutSource()
  const {
    isOpen,
    layoutMetas,
    defaultLayoutId,
    deleteTarget,
    rootRef,
    toggle,
    selectOfficial,
    selectCustom,
    createLayout,
    toggleDefault,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useLayoutSwitcher()
  const panelId = useId()

  // 開閉状態を親へ通知する。左下FABの表示条件(use-admin-fab-visibility)に使われる
  useEffect(() => {
    onExpandedChange?.(isOpen)
  }, [isOpen, onExpandedChange])

  return (
    <>
      <div
        ref={rootRef}
        className={`${styles.root}${isOpen ? ` ${styles.isOpen}` : ''}`}
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
        <div className={styles.panel} id={panelId} inert={!isOpen}>
          <div className={styles.panelInner}>
            <div className={styles.officialList}>
              {FLOORS.map((floor) => (
                <OfficialLayoutButton
                  key={floor.floorId}
                  floor={floor}
                  isSelected={source.type === 'official' && source.floorId === floor.floorId}
                  onSelect={selectOfficial}
                />
              ))}
            </div>
            <CustomLayoutList
              layoutMetas={layoutMetas}
              source={source}
              defaultLayoutId={defaultLayoutId}
              onSelect={selectCustom}
              onToggleDefault={toggleDefault}
              onDelete={requestDelete}
            />
            <CreateLayoutForm layoutCount={layoutMetas.length} onCreate={createLayout} />
          </div>
        </div>
      </div>
      {/* .layout-switcherはtransform+overflow:hiddenでposition:fixedの包含ブロックになるため、
          全画面backdropを持つダイアログはその外(rootRefの兄弟)に出す。中に置くと
          アイランドの小さな箱にクリップされて見えなくなる */}
      {deleteTarget && (
        <LayoutDeleteConfirmDialog
          target={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </>
  )
}
