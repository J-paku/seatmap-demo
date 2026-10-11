import type { LayoutSave } from '../hooks/use-layout-save'
import { LiveRegion } from '@/components/a11y/components/LiveRegion'
import { TOAST_MESSAGES } from '@/utils/toast-messages'
import styles from '@/components/seatmap.module.css'

// 画面に出す通知(座席未設定などの一時通知・その読み上げ・保存成功トースト)

type Props = {
  // 一時通知の文言。null なら出さない
  unassignedNotice: string | null
  save: LayoutSave
}

export const NoticeToasts = ({ unassignedNotice, save }: Props) => (
  <>
    {unassignedNotice && <div className={styles.empDirUnassignedToast}>{unassignedNotice}</div>}
    {/* 画面を見ていない人にも同じ文言を渡す。トーストと同一の文字列を使う */}
    <LiveRegion message={unassignedNotice ?? ''} />
    {/* 05-6: 保存成功トーストは画面中央・5秒・「元に戻す」つき。座席未設定通知(下部固定)とは
        位置が違うので別クラスを使う */}
    {save.saveToast && (
      <div className={styles.saveToast} role='status'>
        {save.saveToast}
        {save.canUndoSave && (
          <button type='button' className={styles.saveToastUndo} onClick={save.undoSave}>
            {TOAST_MESSAGES.UNDO_ACTION}
          </button>
        )}
      </div>
    )}
  </>
)
