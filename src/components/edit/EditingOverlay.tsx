// 09-editing-overlay: 編集セッションに入ったことを画面全体で伝えるオーバーレイ。
// 仕様書の3要素(全面ディム・外郭グロー・「編集中」ラベル)のうち、外郭グローは
// components/seatmap.module.css の `.seatMapPage:has([data-edit-mode-badge])::after` が
// data-edit-mode-badge を起点にすでに描画している(editFramePulse)。役割が重複するため
// ここでは再実装せず、旧 EditBadge が持っていたそのフックを下のラベルへ引き継ぐ
// (EditBadge は編集中バッジとしての役割がこのラベルと重複するため廃止した)。
// 3要素とも操作を一切奪わない — pointer-events: none は admin-edit.module.css 側の
// .editingOverlayDim / .editingOverlayLabel(および既存の .seatMapPage::after)に固定してある
import e from './admin-edit.module.css'

export const EditingOverlay = () => (
  <>
    <div className={e.editingOverlayDim} aria-hidden='true' />
    <div className={e.editingOverlayLabel} data-edit-mode-badge='true' aria-hidden='true'>
      <span className={e.editingOverlayDot} />
      編集中
    </div>
  </>
)
