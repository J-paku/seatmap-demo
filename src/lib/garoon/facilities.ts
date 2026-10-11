// Garoon(予定システム)側のモック。施設マスタと接続状態は「アプリの外の持ち物」なので lib/ に置く
// (docs/structure.md 2. の実例で mock-loader.ts と同じ区分。純関数ではなく外部システムの写し)。
//
// mocks/*.json へは足さない — あれは scripts/generate-mocks.mjs の決定論的な産物で、
// 直接書くと次の再生成で消える。マスタは生成器の管轄外(Garoon 側の登録簿)なのでここへ置く。
//
// DECISION D3: デモは接続済み固定・マスタは目視できる固定配列。
//
// このマスタは実際には Garoon REST `GET /api/v1/schedule/facilities` の取得結果に相当する
// (本デモでは接続を模倣せず、固定配列で代用している)。

export type GaroonFacility = {
  // 予定システムの施設ID。レイアウト上の Facility.id ではなく Facility.facilityId と突き合わせる
  // (両者を取り違えると配置済み判定が常に false になる)
  facilityId: string
  name: string
  // 五十音ソートの鍵。漢字表記からは読みが決まらないので、並べ替えの根拠をマスタが持つ。
  // 表記だけで Intl.Collator に渡すと漢字は部首・画数順になり五十音にならない
  kana: string
}

// F-01〜F-04(会議室A〜D)と F-06・F-07(会議室E・F)は mocks の連携済み会議室と同じ施設IDで、
// 既に地図へ置かれている分。F-05 は応接室が「施設未連携」デモとして番号だけ消費している。
// F-08 以降は Garoon には登録済みだが、まだどのフロアにも置かれていない室
// (ここが無いと全件が「配置済み」になり、ピッカーから1件も置けなくなる)
export const GAROON_FACILITY_MASTER: readonly GaroonFacility[] = [
  { facilityId: 'F-01', name: '会議室A', kana: 'カイギシツエー' },
  { facilityId: 'F-02', name: '会議室B', kana: 'カイギシツビー' },
  { facilityId: 'F-03', name: '会議室C', kana: 'カイギシツシー' },
  { facilityId: 'F-04', name: '会議室D', kana: 'カイギシツディー' },
  { facilityId: 'F-06', name: '会議室E', kana: 'カイギシツイー' },
  { facilityId: 'F-07', name: '会議室F', kana: 'カイギシツエフ' },
  { facilityId: 'F-08', name: '大会議室', kana: 'ダイカイギシツ' },
  { facilityId: 'F-09', name: '役員会議室', kana: 'ヤクインカイギシツ' },
  { facilityId: 'F-10', name: 'セミナールーム', kana: 'セミナールーム' },
  { facilityId: 'F-11', name: '研修室', kana: 'ケンシュウシツ' },
]

// §03-1 の施設タイルの可否。DECISION D3 により本デモは接続済み固定だが、
// 未接続の見た目(タイル disabled + 脚注)は分岐として残す — 戻り値を false にすればそのまま出る
export const isGaroonConnected = (): boolean => true
