// トースト通知メッセージの一括管理定数

export const TOAST_MESSAGES = {
  // 保存系
  SAVE_SUCCESS: '保存しました',
  SAVE_OFFLINE: 'オフラインのため端末に一時保存しました',
  SAVE_FAILED: '保存に失敗しました',

  // 権限・ネットワーク系
  NETWORK_CHECK: 'ネットワーク接続を確認してください',
  ADMIN_REQUIRED: '編集には管理者権限が必要です',
  CONFLICT_UPDATE: '他の管理者が更新しました',

  // ズーム操作系
  VIEW_RESET: '表示をリセットしました',
  GO_TO_MY_SEAT: '自分の席を表示しています',

  // API エラー系
  API_AUTH_ERROR: '認証エラーが発生しました。ログイン状態を確認してください',
  API_NETWORK_ERROR: '通信エラーが発生しました。ネットワーク接続を確認してください',

  // 社員配属系
  ASSIGN_SUCCESS: '{name}を{seatId}に配属しました',
  ASSIGN_REPLACE: '{seatId}の配属を{name}に変更しました',
  ASSIGN_MOVE: '{name}を{seatId}に移動しました',
  ASSIGN_SWAP: '{name1}({seat1})と{name2}({seat2})の座席を交換しました',

  // 削除系
  DELETE_SUCCESS: '削除しました',
  DELETE_TEAM_SUCCESS: '「{name}」を削除しました',
  DELETE_FACILITY_SUCCESS: '「{name}」を削除しました',

  // アクション系
  COPY_SUCCESS: 'コピーしました',
  COPY_FAILED: 'コピーに失敗しました',
  AVATAR_IMPORT_SUCCESS: '生成AIの応答を反映しました',
  AVATAR_IMPORT_FAILED: '生成AIの応答を読み込めませんでした',
  UNDO_ACTION: '元に戻す',
  UNDO_SUCCESS: '元に戻しました',
} as const

// ズーム尺度メッセージ（100%基準のパーセント表示）
export const toastZoomScale = (pct: number) => `ズーム ${pct}%`
