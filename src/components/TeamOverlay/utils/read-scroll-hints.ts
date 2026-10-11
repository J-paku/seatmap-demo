// 横スクロールヒント(use-scroll-hints)の実測値を実 DOM から読み、前回値と比べる

export type ScrollHints = {
  hasOverflow: boolean
  atStart: boolean
  atEnd: boolean
}

// 実 DOM から現在値を読む
export const readHints = (el: HTMLElement): ScrollHints => {
  const max = el.scrollWidth - el.clientWidth
  return {
    hasOverflow: max > 1,
    atStart: el.scrollLeft <= 1,
    atEnd: el.scrollLeft >= max - 1,
  }
}

export const isSameHints = (a: ScrollHints, b: ScrollHints): boolean =>
  a.hasOverflow === b.hasOverflow && a.atStart === b.atStart && a.atEnd === b.atEnd
