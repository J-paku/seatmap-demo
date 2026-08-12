// verify-edit-anchors.js — SPEC-4edit-flows.md §08-4 E2Eアンカー + §07-6 トースト文言のうち
// DOM で確認できるものを検査する。verify-s1.js と同じ注入型IIFEで、実行中の画面へ丸ごと貼って
// 実行すると { verdict, state, checkedAnchors, pass, fail, skip } を返す。
//
// §08-4 のアンカーの大半は「特定の状態でしか存在しない」。したがって本スクリプトは:
//  1. まず DOM から現在の画面状態を判定する(state)
//  2. その状態で「あるべきアンカーだけ」を存在チェックし、「無いべきアンカー」は不在を断言する
//  3. 状態を判定できない(座席マップ画面自体が読み込まれていない等)場合は verdict:'UNKNOWN' で
//     即終了し、何も検査しない — 0件検査で PASS を返す方が誤りより危険なため
//  4. 検査したアンカー数(checkedAnchors)を必ず返す。pass が空なのに PASS になることはない
//
// 状態は排他ではなく優先順位で決める(内側の状態ほど先に判定): 社員検索シート > ゴースト配置中 >
// オーバーレイ編集中 > オーバーレイ閲覧中 > 編集セッション中 > 閲覧(既定)。
;(() => {
  const pass = [], fail = [], skip = []
  const ck = (name, ok, detail) => (ok ? pass : fail).push(name + (detail ? ` — ${detail}` : ''))
  const sk = (name, detail) => skip.push(name + (detail ? ` — ${detail}` : ''))

  const byAriaLabel = (label) => [...document.querySelectorAll(`[aria-label="${CSS.escape(label)}"]`)]
  const byAriaLabelPrefix = (prefix) =>
    [...document.querySelectorAll('[aria-label]')].filter((el) => (el.getAttribute('aria-label') || '').startsWith(prefix))
  const exists = (label) => byAriaLabel(label).length > 0
  const existsPrefix = (prefix) => byAriaLabelPrefix(prefix).length > 0
  const absent = (label) => byAriaLabel(label).length === 0

  // ---- 0. 状態判定の土台。座席マップの変換レイヤーすら無ければ判定不能 ----
  const hasCanvas = !!document.querySelector('[data-canvas-transform-layer="true"]')
  if (!hasCanvas) {
    const report = {
      verdict: 'UNKNOWN',
      state: null,
      checkedAnchors: 0,
      pass: [],
      fail: [],
      skip: [],
      note: 'data-canvas-transform-layer が無い。座席マップ画面が読み込まれていないため状態判定不能',
    }
    console.log(JSON.stringify(report, null, 1))
    return report
  }

  // ---- 1. 画面状態の判定(DOM フックのみで判定する) ----
  const editBadge = document.querySelector('[data-edit-mode-badge="true"]')
  const ghostCenter = document.querySelector('[role="img"][aria-label="配置プレビュー（ドラッグで移動）"]')
  const dialogs = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
  const employeeSheet = dialogs.find((d) => d.getAttribute('aria-label') === '社員検索')
  // チームオーバーレイの aria-label は `${teamName} 座席配置`。社員検索シートの aria-label(社員検索)
  // とは末尾が異なるので / 座席配置$/ で衝突なく判定できる
  const overlayDialog = dialogs.find((d) => / 座席配置$/.test(d.getAttribute('aria-label') || ''))
  const editDock = document.querySelector('[role="group"][aria-label="編集ツールバー"]')

  let state
  if (employeeSheet) state = 'employee-search'
  else if (ghostCenter) state = 'ghost-placement'
  else if (overlayDialog && editDock) state = 'overlay-edit'
  else if (overlayDialog) state = 'overlay-view'
  else if (editBadge) state = 'edit-session'
  else state = 'browsing'

  // ---- 2. 状態別チェック ----

  if (state === 'browsing') {
    // §01: +FABは管理者・セッション非アクティブ時のみ(use-admin-fab-visibility.ts)
    ck('+FAB(追加メニューを開く)が存在', exists('追加メニューを開く'))
    ck('セッション系アンカーが不在(編集を完了)', absent('編集を完了'))
    ck('オーバーレイ系アンカーが不在(所属人員を編集)', absent('所属人員を編集'))
    ck('ゴースト系アンカーが不在(配置プレビュー（ドラッグで移動）)', absent('配置プレビュー（ドラッグで移動）'))
  }

  if (state === 'edit-session') {
    // §05-2: セッションリモコン(完了/キャンセル)+ 右上コントロール(終了/ヘルプ)
    ck('セッション完了(編集を完了)が存在', exists('編集を完了'))
    ck('セッションキャンセル(編集をキャンセル)が存在', exists('編集をキャンセル'))
    ck('セッション終了(編集を終了)が存在', exists('編集を終了'))
    ck('使い方ヘルプ(使い方ガイドを見る)が存在', exists('使い方ガイドを見る'))
    ck('+FABが存在(セッション中も閉じた状態で表示維持、本家仕様 F-06)', exists('追加メニューを開く'))
    ck('ゴースト系アンカーが不在(配置中ではない)', absent('配置プレビュー（ドラッグで移動）'))
  }

  if (state === 'ghost-placement') {
    // §04-2/04-4: ゴースト本体+アクションバー。§05-2: 配置中はセッションリモコンの代わりに
    // アクションバーが出るが、右上コントロール(終了/ヘルプ)は表示され続ける
    ck('ゴースト本体(配置プレビュー（ドラッグで移動）)が存在', exists('配置プレビュー（ドラッグで移動）'))
    ck(
      'ゴースト確定(この位置に配置 / 重なっているため配置できません)が存在',
      exists('この位置に配置') || exists('重なっているため配置できません'),
    )
    ck('ゴーストキャンセル(配置をキャンセル)が存在', exists('配置をキャンセル'))
    ck('セッション終了(編集を終了)が存在(配置中も表示される)', exists('編集を終了'))
    ck('使い方ヘルプ(使い方ガイドを見る)が存在(配置中も表示される)', exists('使い方ガイドを見る'))
    ck('セッションリモコンが不在(配置中はアクションバーへ入れ替わる、§05-2)', absent('編集を完了'))
    ck('+FABが不在', absent('追加メニューを開く'))

    // §04-4: リサイズ可能条件(kind==='furniture' && furnitureKind==='facility' && mode==='move')を
    // 満たすゴーストだけ、装飾のみの空 <span> ハンドルが8個現れる(components/GhostPlacementLayer/
    // components/GhostPreview.tsx)。aria-label 自体がまだ実装に無いため文言では判定できず、
    // 「中央ハンドルの兄弟にあるテキストなし・子要素なしの span」という構造で先にリサイズ可能状態かを
    // 判定してから、その上でアンカーの有無を問う
    const ghostRoot = ghostCenter.parentElement
    const handleSpans = ghostRoot
      ? [...ghostRoot.children].filter(
          (el) => el.tagName === 'SPAN' && el !== ghostCenter && el.textContent.trim() === '' && el.children.length === 0,
        )
      : []
    if (handleSpans.length > 0) {
      ck(
        `リサイズハンドル(サイズを変更)が${handleSpans.length}個に付与`,
        handleSpans.every((el) => el.getAttribute('aria-label') === 'サイズを変更'),
        '§08-4 未実装: GhostPreview のリサイズハンドル(span.handle)に aria-label が無い',
      )
    } else {
      sk('リサイズハンドル(サイズを変更)', 'このゴーストはリサイズ不可(施設の移動モードではない)ため対象外')
    }
  }

  if (state === 'overlay-view') {
    // §06-1: 鉛筆(所属人員を編集)は管理者のみ表示。編集中ではないので EditDock は無い
    ck('オーバーレイ鉛筆(所属人員を編集)が存在', exists('所属人員を編集'))
    ck('編集ツールバーが不在(編集モードではない、§06-3)', !editDock)
    ck('+FABが不在(オーバーレイ表示中、use-admin-fab-visibility.ts)', absent('追加メニューを開く'))
    ck('ゴースト系アンカーが不在', absent('配置プレビュー（ドラッグで移動）'))
  }

  if (state === 'overlay-edit') {
    // §06-3: EditDock(保存/キャンセル)。鉛筆は編集中バッジ+終了ボタンに入れ替わり消える
    ck('編集ツールバー(role=group・編集ツールバー)が存在', !!editDock)
    ck('保存(変更を保存)が存在', exists('変更を保存'))
    ck('編集キャンセル(編集をキャンセル)が存在', exists('編集をキャンセル'))
    ck('オーバーレイ鉛筆が不在(編集中は終了ボタンへ入れ替わる、§06-1)', absent('所属人員を編集'))
    ck('+FABが不在', absent('追加メニューを開く'))
    ck('ゴースト系アンカーが不在', absent('配置プレビュー（ドラッグで移動）'))

    // §06-2: 座席削除は仕様上 aria-label='座席を削除' だが、実装(components/edit/SeatActionBar.tsx)の
    // 削除ボタンは可視テキスト「削除」のみで aria-label が付いていない。検査から外さず正直に fail へ
    // 落とす(次ラウンドの修正対象)
    ck(
      '座席削除(座席を削除)が存在',
      exists('座席を削除'),
      '§06-2 未実装/文言不一致: SeatActionBar の削除ボタンに aria-label="座席を削除" が付与されていない(可視テキストのみ「削除」)',
    )

    // §06-2: フリーアドレス設定(role=switch)のトグルUI自体が未実装(型定義 freeAddressEnabled はあるが
    // 編集UIが無い)
    ck(
      'フリーアドレス設定(role=switch)が存在',
      !!document.querySelector('[role="switch"][aria-label="フリーアドレス設定"]'),
      '§06-2 未実装: freeAddressEnabled を編集するUIが存在しない(型定義のみ)',
    )

    // 以下は「そのチームの現在の状態次第で出たり出なかったりする」もの。出ていれば検査し、
    // 出ていなければ fail ではなく skip にする(0件でも成立し得る正常状態のため)
    if (exists('席追加')) ck('空セル(席追加)が存在', true)
    else sk('空セル(席追加)', 'このチームに空セルが無い(全席埋まっている)ため対象外')

    if (existsPrefix('座席の向きを回転（現在 ')) ck('回転グリップ(座席の向きを回転（現在 …）)が存在', true)
    else sk('回転グリップ(座席の向きを回転（現在 …）)', '選択中の座席が無い(選択時のみ表示)ため対象外')

    const rowDel = exists('空き行を削除')
    const colDel = exists('空き列を削除')
    if (rowDel || colDel) ck('空き行・列削除が存在', true, `行=${rowDel} 列=${colDel}`)
    else sk('空き行・列削除', '完全に空の行・列が無いため対象外(§06-2: 非空はno-op)')

    if (exists('部署メンバーを一括取込')) ck('部署一括取込(部署メンバーを一括取込)が存在', true)
    else sk('部署メンバーを一括取込', 'canBulkAssign が false(対象社員なし)のため条件レンダーで非表示')
  }

  if (state === 'employee-search') {
    // §06-4: single(検索+一括取込導線)/bulk(チェックボックス一覧)でヘッダー直下の中身が変わる
    ck('社員検索シート(role=dialog・aria-label=社員検索)が存在', !!employeeSheet)
    if (exists('社員を検索')) ck('検索欄(社員を検索)が存在', true)
    else sk('検索欄(社員を検索)', '一括取込(bulk)モード中は検索欄の代わりにチェックボックス一覧が出るため対象外')
    if (exists('部署メンバーを一括取込')) ck('部署一括取込ボタンが存在(検索モード内)', true)
    else sk('部署メンバーを一括取込(シート内)', 'canBulkAssign条件を満たさない、またはbulkモード中のため対象外')
  }

  // ---- 3. 戻すチップ: どの状態でも出得る一時要素(§04-5: 4秒で自動消滅)。出ていれば追加で検査する ----
  if (exists('直前の変更を戻す')) ck('戻すチップ(直前の変更を戻す)が存在', true)
  else sk('戻すチップ(直前の変更を戻す)', '現在表示されていない(4秒で自動消滅する一時要素のため常には出ない)')

  // ---- 4. 空虚な通過の防止: 検査数0でPASSにはしない ----
  const checkedAnchors = pass.length + fail.length
  const verdict = checkedAnchors === 0 ? 'UNKNOWN' : fail.length === 0 ? 'PASS' : 'FAIL'
  const report = { verdict, state, checkedAnchors, pass, fail, skip }
  console.log(JSON.stringify(report, null, 1))
  return report
})()
