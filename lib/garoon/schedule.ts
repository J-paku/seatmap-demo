// Garoon予定システムのREST境界を記述する型・定数のみを持つファイル(fetch実装はここに置かない)。
// 認証は `X-Cybozu-Authorization` ヘッダー(ログイン名とパスワードをBase64エンコードした値)を
// 付与する想定。デモでは mocks/schedules.json を fetch-mock.ts 経由で返しているだけだが、
// 実接続に切り替える際はこの境界(パス・パラメータ形状)だけを差し替えれば成立するように分けている。
//
// 予定の取得はREST APIを採用する。組織の一括取得と違い、対象期間・対象者を絞った問い合わせが
// 基本となるため、REST特有のページングの負担が実用範囲に収まる(組織側の判断は lib/garoon/org.ts)。

export const GAROON_SCHEDULE_EVENTS_PATH = '/api/v1/schedule/events'

/**
 * GET /api/v1/schedule/events のクエリパラメータ形状。確信のあるものだけを持つ
 * @public 実接続に切り替える際の要求形状を示す境界ドキュメントであり、現状コード内から未参照でも残す
 */
export type GaroonScheduleEventsRequest = {
  // 取得対象期間の開始・終了(ISO 8601)
  rangeStart: string
  rangeEnd: string
  // 対象のID。targetType に応じて社員・組織・施設のいずれかのIDを渡す
  target: string
  targetType: 'user' | 'organization' | 'facility'
}
