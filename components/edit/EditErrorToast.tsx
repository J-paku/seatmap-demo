// 07-admin-edit: エラートースト(衝突規則違反時の拒否理由を一過性表示)
type Props = {
  message: string
}

export const EditErrorToast = ({ message }: Props) => (
  <div className='edit-error-toast' role='alert'>
    {message}
  </div>
)
