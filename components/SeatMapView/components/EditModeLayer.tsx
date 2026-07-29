import { EditBadge, EditTopControls } from '@/components/edit/EditBadgeAndControls'
import { EditRemoteBar } from '@/components/edit/EditRemoteBar'

// 編集モード中だけ出る常駐UI(バッジ・上部操作・リモコンバー)

type Props = {
  changedCount: number
  isSaving: boolean
  onFinish: () => void
  onCancel: () => void
}

export const EditModeLayer = ({ changedCount, isSaving, onFinish, onCancel }: Props) => (
  <>
    <EditBadge />
    <EditTopControls onHelp={() => {}} onExit={onCancel} />
    <EditRemoteBar changedCount={changedCount} isSaving={isSaving} onFinish={onFinish} onCancel={onCancel} />
  </>
)
