// useOverlayEditWiring(TeamOverlay の編集配線)が使う、追加直後の席のハイライト時間

// STEP B5: 追加直後の席をハイライト(選択状態を流用)しておく時間。この間に別のセル/席を
// 選択し直した場合はハイライトを奪わない(use-overlay-edit-wiring の useEffect が
// isSeatSelected の変化で再評価する)
export const SEAT_ADD_HIGHLIGHT_MS = 1800
