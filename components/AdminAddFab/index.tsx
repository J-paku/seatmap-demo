// 左下管理パネルの本体。タップでスピードダイヤルを開閉する
import type { CSSProperties } from 'react'
import { useAdminAddFab } from './hooks/use-admin-add-fab'
import type { UseAdminAddFabParams } from './hooks/use-admin-add-fab'
import styles from '../object-picker.module.css'

type Props = UseAdminAddFabParams

type MenuItem = {
  key: string
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
  hint?: string
}

export const AdminAddFab = ({ onSelectTeam, onSelectFacility, onEditLayout }: Props) => {
  const {
    isMenuOpen,
    closeMenu,
    fabRef,
    menuRef,
    fabHandlers,
    onMenuKeyDown,
    handleSelectTeam,
    handleSelectFacility,
    handleEditLayout,
  } = useAdminAddFab({ onSelectTeam, onSelectFacility, onEditLayout })

  const items: MenuItem[] = [
    { key: 'team', label: 'チーム', icon: 'groups', onClick: handleSelectTeam },
    { key: 'facility', label: '設備', icon: 'event_note', onClick: handleSelectFacility },
    { key: 'edit', label: 'レイアウトを編集', icon: 'edit', onClick: handleEditLayout },
  ]

  return (
    <div className={styles.adminFabWrap}>
      {isMenuOpen && (
        <div
          className={styles.adminFabBackdrop}
          aria-hidden='true'
          onClick={closeMenu}
          onWheel={closeMenu}
          onTouchMove={closeMenu}
        />
      )}

      {isMenuOpen && (
        <div ref={menuRef} className={`${styles.adminFabMenu} liquid-glass`} role='menu' onKeyDown={onMenuKeyDown}>
          {items.map((item, index) => (
            <button
              key={item.key}
              type='button'
              role='menuitem'
              className={`${styles.adminFabRow} glass-dial-row glass-stagger-item`}
              style={{ '--glass-stagger-i': items.length - 1 - index } as CSSProperties}
              onClick={item.disabled ? undefined : item.onClick}
              aria-disabled={item.disabled}
            >
              <span className={`icon-msr-filled ${styles.adminFabRowIcon}`} aria-hidden='true'>
                {item.icon}
              </span>
              <span className={styles.adminFabRowLabel}>{item.label}</span>
              {item.hint && <span className={styles.adminFabRowHint}>{item.hint}</span>}
            </button>
          ))}
        </div>
      )}

      <button
        ref={fabRef}
        type='button'
        className={`${styles.adminFabBtn} glass-fab-accent${isMenuOpen ? ` ${styles.isOpen}` : ''}`}
        data-coach='admin-fab'
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? '追加メニューを閉じる' : '追加メニューを開く'}
        onPointerDown={fabHandlers.onPointerDown}
        onPointerMove={fabHandlers.onPointerMove}
        onPointerUp={fabHandlers.onPointerUp}
        onPointerLeave={fabHandlers.onPointerLeave}
        onPointerCancel={fabHandlers.onPointerCancel}
        onClick={fabHandlers.onClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className={`icon-msr-filled ${styles.adminFabIcon}`} aria-hidden='true'>
          add
        </span>
      </button>
    </div>
  )
}
