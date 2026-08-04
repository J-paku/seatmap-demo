import { EditBadge, EditTopControls } from '@/components/edit/EditBadgeAndControls'
import { EditRemoteBar } from '@/components/edit/EditRemoteBar'

// 編集モード中だけ出る常駐UI(バッジ・上部操作・リモコンバー)

type Props = {
  changedCount: number
  isSaving: boolean
  // ゴースト配置中。画面下部の主役をゴーストのアクションバーへ譲る
  isPlacing: boolean
  onFinish: () => void
  onCancel: () => void
}

export const EditModeLayer = ({ changedCount, isSaving, isPlacing, onFinish, onCancel }: Props) => (
  <>
    <EditBadge />
    <EditTopControls onHelp={() => {}} onExit={onCancel} />
    {/* 配置中はリモコンバーを出さない。画面下端で2本のバーが重なるうえ、
        配置を決めていない途中で「完了」を押させる意味も無い */}
    {!isPlacing && (
      <EditRemoteBar changedCount={changedCount} isSaving={isSaving} onFinish={onFinish} onCancel={onCancel} />
    )}
  </>
)
