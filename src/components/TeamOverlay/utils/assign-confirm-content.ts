// useOverlayAssign(配属まわりの配線)が使う確認文言の組み立てと、チーム名を引けなかった時の逃げ道の語

// §07-4「場所表記はチーム名(生の座席IDは出さない)」。レイアウトから名前を引けなかった時の
// 逃げ道もチーム名相当の語にする — ここで座席IDへフォールバックすると仕様違反が復活する
export const UNKNOWN_TEAM_NAME = '別のチーム'

// §07-4 配属確認の内容。文字列の組み立てはこの純関数に閉じ、描画側は受け取った値を並べるだけにする
export type AssignConfirmContent = {
  title: string
  message: string
  supplement: string
  confirmLabel: string
}

type AssignConfirmInput = {
  // 配属しようとしている社員の氏名
  employeeName: string
  // その社員が今座っている席のチーム名。どこにも座っていなければnull
  fromTeamName: string | null
  // 配属先の席が属するチーム名(=オーバーレイで開いているチーム)
  toTeamName: string
  // 配属先の席に今座っている社員の氏名。空席ならnull
  occupantName: string | null
  // 移動元と移動先が同じチームか
  isSameTeam: boolean
}

// 対象が空席×未配属者なら確認なし(null)。それ以外は§07-4の3ケースへ振り分ける。
// 補足行は「実際に起きること」に合わせて選ぶ — use-seat-draft-state.assignEmployee は、
// 配属先に人が居れば その人を移動元の席へ入れ替え、居なければ移動元を空席にするため
export const buildAssignConfirmContent = ({
  employeeName,
  fromTeamName,
  toTeamName,
  occupantName,
  isSameTeam,
}: AssignConfirmInput): AssignConfirmContent | null => {
  // 空席 × 未配属者は即配属(§06-4)
  if (fromTeamName === null && occupantName === null) return null
  // 未配属者を在席中の席へ入れる = 担当者差し替え
  if (fromTeamName === null) {
    return {
      title: '社員を変更しますか？',
      message: `${toTeamName}の担当者を${employeeName}に変更しますか？`,
      supplement: `現在の${occupantName}は解除されます`,
      confirmLabel: '変更する',
    }
  }
  return {
    title: '社員の席を移動しますか？',
    message: isSameTeam
      ? `${employeeName}は現在、${fromTeamName}に配属されています。同じ${fromTeamName}内で席を移動しますか？`
      : `${employeeName}は現在、${fromTeamName}に配属されています。${toTeamName}へ移動しますか？`,
    supplement:
      occupantName === null
        ? `${fromTeamName}の元の席は空席になります`
        : `現在の${occupantName}は${fromTeamName}へ移動します`,
    confirmLabel: '移動する',
  }
}
