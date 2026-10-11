// 押下からの移動量がこれを超えたらドラッグ確定とみなす(px)。これ以下は「掴んだだけ」。
// 編集ドラッグ(use-edit-drag)とゴースト(use-ghost-drag)が同じ値を使う — 割れると同じ指の動きで判定が割れる
export const DRAG_CONFIRM_PX = 3
