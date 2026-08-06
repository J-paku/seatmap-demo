// 左下管理パネルの本体。タップでスピードダイヤルを開閉し、長押しで編集モードへ入る
import type { CSSProperties } from 'react'
import { useAdminAddFab } from './hooks/use-admin-add-fab'
import type { UseAdminAddFabParams } from './hooks/use-admin-add-fab'

type Props = UseAdminAddFabParams

type MenuItem = {
  key: string
  label: string
  icon: string
  onClick: () => void
}

export const AdminAddFab = ({ onSelectTeam, onSelectFacility, onEnterEdit }: Props) => {
  const {
    isMenuOpen,
    closeMenu,
    fabRef,
    menuRef,
    fabHandlers,
    onMenuKeyDown,
    handleSelectTeam,
    handleSelectFacility,
    handleEnterEdit,
  } = useAdminAddFab({ onSelectTeam, onSelectFacility, onEnterEdit })

  const items: MenuItem[] = [
    { key: 'team', label: 'チーム', icon: 'groups', onClick: handleSelectTeam },
    { key: 'facility', label: '設備', icon: 'event_note', onClick: handleSelectFacility },
    { key: 'edit', label: 'レイアウトを編集', icon: 'edit', onClick: handleEnterEdit },
  ]

  return (
    <div className='admin-fab-wrap'>
      {isMenuOpen && (
        <div className='admin-fab-backdrop' onClick={closeMenu} onWheel={closeMenu} onTouchMove={closeMenu} />
      )}

      {isMenuOpen && (
        <div ref={menuRef} className='admin-fab-menu liquid-glass' role='menu' onKeyDown={onMenuKeyDown}>
          {items.map((item, index) => (
            <button
              key={item.key}
              type='button'
              role='menuitem'
              className='admin-fab-row glass-dial-row glass-stagger-item'
              style={{ '--glass-stagger-i': items.length - 1 - index } as CSSProperties}
              onClick={item.onClick}
            >
              <span className='icon-msr-thin admin-fab-row-icon' aria-hidden='true'>
                {item.icon}
              </span>
              <span className='admin-fab-row-label'>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <button
        ref={fabRef}
        type='button'
        className={`admin-fab-btn glass-fab-accent${isMenuOpen ? ' is-open' : ''}`}
        data-coach='admin-fab'
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? '追加メニューを閉じる' : '追加メニューを開く'}
        onPointerDown={fabHandlers.onPointerDown}
        onPointerMove={fabHandlers.onPointerMove}
        onPointerUp={fabHandlers.onPointerUp}
        onPointerLeave={fabHandlers.onPointerLeave}
        onClick={fabHandlers.onClick}
      >
        <span className='icon-msr-thin admin-fab-icon' aria-hidden='true'>
          add
        </span>
      </button>
    </div>
  )
}
