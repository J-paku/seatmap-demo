// Garoon組織(部署)取得の境界を記述する型のみを持つファイル。XML文字列・パーサーはここに置かない。
// どこからもimportされない境界ドキュメントのため、knip.json の ignore に登録している。
//
// 組織だけはSOAP(Base API)を採用する。REST の組織APIは1リクエストあたりの取得件数に上限があり、
// 全組織を取るには複数リクエストのページングが必要になる。SOAPは組織ツリーを一括取得できるため、
// 部署数が多い環境でもリクエスト数が増えない(予定の取得はREST — lib/garoon/schedule.ts 参照)。
//
// SOAPのアクション名は未確認のため断定を避け、「Base API の組織一括取得」とだけ記す。
// mocks/teams.json はこの一括取得結果に相当するモックで、各エントリの idPrefix が
// GaroonOrganizationUnit.id に対応する想定

// 組織一括取得で返る1組織の単位
export type GaroonOrganizationUnit = {
  // Garoon側の組織ID。mocks/teams.json の idPrefix に対応する想定
  id: string
  name: string
  // 親組織ID。ルート直下の組織は null
  parentId: string | null
}

// 組織一括取得の要求パラメータ。省略時は全組織ツリーを取得する想定
export type GaroonOrganizationBulkFetchRequest = {
  target?: string
}
