import type { useLayoutEditor } from '@/lib/use-layout-editor'

// 編集モードの状態と発行口。ページ配下のフックが共通で受け取る
export type LayoutEditor = ReturnType<typeof useLayoutEditor>
