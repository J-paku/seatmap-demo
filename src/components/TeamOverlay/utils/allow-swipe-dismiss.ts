// 下スワイプで閉じるのは Compact だけの挙動。閉じている間はジェスチャーを受け付けない
export const allowsSwipeDismiss = (isOpen: boolean, isCompactMobile: boolean): boolean =>
  isOpen && isCompactMobile
