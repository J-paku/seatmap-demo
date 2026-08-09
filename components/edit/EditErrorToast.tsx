// 07-admin-edit: エラートースト(衝突規則違反時の拒否理由を一過性表示)
import e from './admin-edit.module.css'
type Props = {
  message: string
}

export const EditErrorToast = ({ message }: Props) => (
  <div className={e.editErrorToast} role='alert'>
    {message}
  </div>
)
