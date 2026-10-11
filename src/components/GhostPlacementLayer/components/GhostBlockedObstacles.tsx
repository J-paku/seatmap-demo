import styles from '../ghost-placement.module.css'

// ゴーストと重なって配置を妨げている障害物の強調枠。
// 「見た目は空いているのに置けない」の答えを画面上で指す — 相手はチーム枠(4px内側)・
// 会議室・通路のことがあり、特に通路は破線しか描かれず余白に見えるため、これが無いと
// 利用者は何と重なっているのか知りようがない。矩形は親が画面座標へ変換済み
type Props = {
  rects: { left: number; top: number; width: number; height: number }[]
}

export const GhostBlockedObstacles = ({ rects }: Props) => (
  <>
    {rects.map((r, index) => (
      <div
        key={index}
        className={styles.blockedObstacle}
        style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
        data-ghost='obstacle'
        aria-hidden='true'
      />
    ))}
  </>
)
