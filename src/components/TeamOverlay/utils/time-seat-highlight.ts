// 検索ヒット座席への追従(use-seat-highlight-animation)の時間(ms)

export const GLOW_MS = 2200
export const GLOW_REDUCED_MS = 420
// 開いた直後にスクロールしても効かない。理由が2つ重なっている:
//   1. 子の effect は親より先に走るので、親 useOverlaySession の bodyRef.scrollTop = 0 に打ち消される
//   2. パネル自身が拡大アニメーション中で、変形中の祖先の下では smooth スクロールの着地点がずれる
// どちらも「開き終わってから動かす」で解ける。クリックロック 350ms の直後に合わせる
export const SCROLL_DELAY_MS = 360
