// ヒドル降臨コード — ↑3↓3↑7 キーシーケンスを検知し onMatch を呼ぶフック
import { useEffect, useRef } from 'react'

// ヒドル専用シーケンス: ArrowUp × 3 → ArrowDown × 3 → ArrowUp × 7
const KURO_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowDown',
  'ArrowUp',
  'ArrowUp',
  'ArrowUp',
  'ArrowUp',
  'ArrowUp',
  'ArrowUp',
  'ArrowUp',
]

const KURO_KEY = KURO_SEQUENCE.join(',')

// enabled が false の間はリスナーを一切登録しない
export function useKuroCode(onMatch: () => void, enabled: boolean): void {
  const bufRef = useRef<string[]>([])
  // 最新の onMatch を保つための ref(リスナー登録 effect の依存を増やさないため)。
  // レンダー中の代入は副作用なので effect で行う
  const onMatchRef = useRef(onMatch)
  useEffect(() => {
    onMatchRef.current = onMatch
  }, [onMatch])

  useEffect(() => {
    if (!enabled) return
    const handle = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
        bufRef.current = []
        return
      }
      bufRef.current = [...bufRef.current, e.key].slice(-KURO_SEQUENCE.length)
      if (bufRef.current.join(',') === KURO_KEY) {
        bufRef.current = []
        onMatchRef.current()
      }
    }
    window.addEventListener('keydown', handle)
    return () => {
      window.removeEventListener('keydown', handle)
    }
  }, [enabled])
}
