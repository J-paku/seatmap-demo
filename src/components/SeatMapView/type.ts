import type { useLayoutEditor } from '@/hooks/use-layout-editor/use-layout-editor'

// 編集モードの状態と発行口。ページ配下のフックが共通で受け取る
export type LayoutEditor = ReturnType<typeof useLayoutEditor>

// 座席は解決できたがチーム箱を測れなかった場合の理由。呼び出し側が通知文言を決める
export type FocusFailure = 'no-seat' | 'no-team'
