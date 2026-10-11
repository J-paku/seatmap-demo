// 右クリック・長押しで出るブラウザのコンテキストメニューを出さない
export const preventContextMenu = (e: Pick<Event, 'preventDefault'>): void => e.preventDefault()
