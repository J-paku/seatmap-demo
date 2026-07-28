// 07-admin-edit: 編集中バッジ(キャンバス左上)+上端コントロール(？/×・右上)
import { useState } from 'react'

type Props = {
  onHelp: () => void
  onExit: () => void
}

export const EditBadge = () => (
  <div className='edit-mode-badge'>
    <span className='edit-mode-badge-dot' />
    編集中
  </div>
)

export const EditTopControls = ({ onHelp, onExit }: Props) => {
  const [helpOpen, setHelpOpen] = useState(false)
  return (
    <div className='edit-top-controls'>
      <div className='edit-help-wrap'>
        <button
          type='button'
          className='pixel-btn edit-top-btn'
          aria-label='操作ヘルプ'
          aria-expanded={helpOpen}
          onClick={() => {
            setHelpOpen((v) => !v)
            onHelp()
          }}
        >
          ？
        </button>
        {helpOpen && (
          <div className='edit-help-popover' role='tooltip'>
            <p>座席をドラッグして移動できます</p>
            <p>他の座席にドロップすると着席者が入れ替わります</p>
            <p>他チームのエリアにドロップするとチームが変わります</p>
            <p>チーム名をドラッグするとエリアごと移動します</p>
            <button type='button' className='pixel-btn edit-help-close' onClick={() => setHelpOpen(false)}>
              閉じる
            </button>
          </div>
        )}
      </div>
      <button type='button' className='pixel-btn edit-top-btn' aria-label='編集を終了' onClick={onExit}>
        ×
      </button>
    </div>
  )
}
