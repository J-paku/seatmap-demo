import type { CSSProperties } from 'react'

// カードと対象のすき間
const CARD_GAP_PX = 14
// カードを置くのに必要な余白。これを下→上の順に探す
const CARD_MIN_SPACE_PX = 180
// カードが画面端で見切れないよう、中心をこの値まで内側へ寄せる
const CARD_EDGE_MARGIN_PX = 180

// 対象矩形からカードの絶対位置を決める。
// 下に置けるなら下、無理なら上、どちらの余白も足りなければ対象の上端から内側へ垂らす。
// サイドバーのように縦に長い対象は上下どちらにも余白が無く、無条件に上へ回すと
// カードが画面上端の外へ出て切れてしまうため、3つ目の逃げ道を持たせている
export const getCardPlacementStyle = (rect: DOMRect): CSSProperties => {
  const spaceBelow = window.innerHeight - rect.bottom - CARD_GAP_PX
  const spaceAbove = rect.top - CARD_GAP_PX
  const placement =
    spaceBelow >= CARD_MIN_SPACE_PX ? 'below' : spaceAbove >= CARD_MIN_SPACE_PX ? 'above' : 'inside'

  return {
    left: Math.min(
      Math.max(rect.left + rect.width / 2, CARD_EDGE_MARGIN_PX),
      window.innerWidth - CARD_EDGE_MARGIN_PX,
    ),
    top: {
      below: rect.bottom + CARD_GAP_PX,
      above: rect.top - CARD_GAP_PX,
      inside: Math.min(rect.top + CARD_GAP_PX, window.innerHeight - CARD_MIN_SPACE_PX),
    }[placement],
    transform: placement === 'above' ? 'translate(-50%, -100%)' : 'translateX(-50%)',
  }
}
