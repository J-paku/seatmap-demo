// 座席マップの背景 root の id。キャンバスはこの id で描かれ、シートを開いている間は SheetShell が
// この root を無効化し、キャンバスの探索(utils/layout/read-canvas-transform)もこの id で引く。
// E2E(tests/ghost.helpers.ts)と検証スクリプト(scripts/verify-ghost.js)は同じ文字列を直書きしている
export const SEATMAP_BG_ID = 'seatmap-bg-root'
