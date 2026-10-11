import type { FocusFailure } from '../type'

// 一時通知(トーストとライブリージョン)へ流す文言

// 座席へ飛べなかった理由を利用者向けの文言にする
export const focusFailureMessage = (reason: FocusFailure): string =>
  reason === 'no-seat' ? '座席未設定' : '座席の所属チームが不明です'

// 詳細パネルから会議室を削除した完了通知
export const facilityDeletedMessage = (name: string): string => `「${name}」を削除しました`
