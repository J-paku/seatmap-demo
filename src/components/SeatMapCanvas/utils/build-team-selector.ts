// チーム箱のインタラクション面を指すセレクタ。属性の値は Team.idPrefix であり Team.id ではない
export const buildTeamSelector = (idPrefix: string): string => `[data-team-id="${idPrefix}"]`
