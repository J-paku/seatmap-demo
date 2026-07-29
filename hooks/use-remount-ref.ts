import { useState } from 'react'

// callback ref として要素へ渡しつつ .current で直接ノード参照もできるハイブリッド。
// 通常の useRef は React が current へ書き込んでも再レンダーを起こさないため、
// 条件付きレンダーで要素が後からマウントされたことを検知できない。
// ここでは着脱のたびに tick を進め、ネイティブリスナーの張り直しを促す

export type RemountRef<T extends HTMLElement> = {
  (node: T | null): void
  current: T | null
}

type Result<T extends HTMLElement> = {
  ref: RemountRef<T>
  // 要素が着脱されるたび増える。エフェクトの依存に入れて張り直しのトリガーにする
  mountTick: number
}

export const useRemountRef = <T extends HTMLElement>(): Result<T> => {
  const [mountTick, setMountTick] = useState(0)

  // callback ref 本体は初期化関数で一度だけ生成し、以後は同じ関数参照を保つ
  // (レンダー中の ref.current 読み取りを避けつつ、呼び出し側の ref={} を安定させる)
  const [ref] = useState<RemountRef<T>>(() => {
    const callback = ((node: T | null) => {
      callback.current = node
      setMountTick((tick) => tick + 1)
    }) as RemountRef<T>
    callback.current = null
    return callback
  })

  return { ref, mountTick }
}
