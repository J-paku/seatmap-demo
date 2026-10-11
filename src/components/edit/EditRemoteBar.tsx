// 07-admin-edit: 下端リモートバー(副ボタン「キャンセル」+ 主ボタン「完了」)
//
// 変更件数は主ボタンの中のチップに入れる。件数を独立した文字として横に置くと
// 「件数・キャンセル・完了」が同じ重さで並び、どれが主操作か一目で決まらなかった。
// 0件のときは主ボタンが押せないので、その理由(=変更が無い)を同じ場所で示すことにもなる
import { triggerHaptic } from '@/utils/haptic'
import e from './admin-edit.module.css'

// aria-label は検証スクリプト(scripts/verify-edit-anchors.js)が完全一致で拾うフックなので変えない。
// 件数は aria-describedby で補足する(aria-label は要素内の文字を上書きしてしまうため)
const COUNT_ID = 'edit-remote-changed-count'

type Props = {
  changedCount: number
  isSaving: boolean
  onFinish: () => void
  onCancel: () => void
}

export const EditRemoteBar = ({ changedCount, isSaving, onFinish, onCancel }: Props) => {
  const canComplete = changedCount >= 1

  return (
    <div className={`${e.editRemoteBar} liquid-glass`}>
      <button
        type='button'
        className={e.editRemoteCancel}
        aria-label='編集をキャンセル'
        onClick={() => {
          triggerHaptic('light')
          onCancel()
        }}
        disabled={isSaving}
      >
        キャンセル
      </button>
      <button
        type='button'
        className={e.editRemoteFinish}
        aria-label='編集を完了'
        aria-describedby={COUNT_ID}
        aria-busy={isSaving}
        onClick={() => {
          if (!canComplete) return
          triggerHaptic('success')
          onFinish()
        }}
        disabled={!canComplete || isSaving}
      >
        {/* 保存中はチェックをスピナーへ差し替えるだけにして、ボタンの幅を動かさない
            (文字ごと「保存中…」へ替えるとバーの横幅が縮んで手元が跳ねる) */}
        {isSaving ? (
          <span className={e.editRemoteSpinner} aria-hidden='true' />
        ) : (
          <span className='material-symbols-outlined' aria-hidden='true'>
            check
          </span>
        )}
        完了
        <span id={COUNT_ID} className={e.editRemoteCount}>
          {changedCount}件
        </span>
      </button>
    </div>
  )
}
