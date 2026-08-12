// 会議室・家具の属性バー(編集モード中に1件選択していて、移動ゴーストが出ていない間だけ表示)。
//
// §05-3 で移動の入口はタップ即ゴーストへ移ったので、このバーは「移動」を持たない。
// 残る役割はロックトグル・ラベル表示トグル・削除の3つ。
// ロック中の対象はタップしてもゴーストが開かないため、ロック解除の入口はここだけになる
import e from './admin-edit.module.css'

type Props = {
  x: number
  y: number
  // 文言に出す対象名(会議室名・家具名)
  name: string
  locked: boolean
  labelVisible: boolean
  // 名前を持たない建設設備(壁・柱・階段…)はラベル自体が無いのでトグルを出さない
  canToggleLabel: boolean
  onToggleLock: () => void
  onToggleLabel: () => void
  onDelete: () => void
}

export const ObjectActionBar = ({
  x,
  y,
  name,
  locked,
  labelVisible,
  canToggleLabel,
  onToggleLock,
  onToggleLabel,
  onDelete,
}: Props) => (
  <div className={e.seatActionBar} style={{ left: x, top: y }} onClick={(event) => event.stopPropagation()}>
    <span className={e.seatActionCount}>{name}</span>
    <button
      type='button'
      className={`pixel-btn ${e.seatActionBtn}`}
      onClick={onToggleLock}
      aria-pressed={locked}
      aria-label={locked ? `${name}のロックを解除` : `${name}をロック`}
    >
      <span className='material-symbols-outlined' aria-hidden='true'>
        {locked ? 'lock' : 'lock_open'}
      </span>
      {locked ? 'ロック解除' : 'ロック'}
    </button>
    {canToggleLabel && (
      <button
        type='button'
        className={`pixel-btn ${e.seatActionBtn}`}
        onClick={onToggleLabel}
        aria-pressed={labelVisible}
        aria-label={labelVisible ? `${name}のラベルを隠す` : `${name}のラベルを表示`}
      >
        <span className='material-symbols-outlined' aria-hidden='true'>
          {labelVisible ? 'label' : 'label_off'}
        </span>
        {labelVisible ? 'ラベル非表示' : 'ラベル表示'}
      </button>
    )}
    <button
      type='button'
      className={`pixel-btn ${e.seatActionBtn} ${e.isDanger}`}
      onClick={onDelete}
      disabled={locked}
      aria-label={locked ? `${name}はロック中のため削除できません` : `${name}を削除`}
    >
      削除
    </button>
  </div>
)
