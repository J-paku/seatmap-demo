import { useCallback, useRef, useState } from 'react'
import type { Seat } from '@/types'

// 座席編集(STEP A2)の下書き差分。UI・グリッド演算・保存処理は他 STEP の担当で、
// ここは「今どこがどう変わっているか」を4本の独立した容れ物で持つだけ。
// 1つの巨大オブジェクトにまとめると件数計上も取り消しも複雑になるため分けている

// 下書きで追加した座席の仮 id。確定 id はレイアウト側の採番口が振るため、
// ここでは「まだ確定していない」と分かる接頭辞だけを持つ
const DRAFT_SEAT_ID_PREFIX = 'seat-draft-'

export type SeatDraftState = {
  // 割当の差分。値 '' は「空席にした」、キーが無い(undefined)は「差分なし」
  assignmentsOverride: Map<string, string>
  // 下書きで追加した座席そのもの(仮 id 込み)
  addedSeats: Seat[]
  // 削除対象にした既存座席の id
  removedSeatIds: Set<string>
  // 回転の差分
  rotationOverrides: Map<string, Seat['rotation']>
  // STEP C3: 部署一括配置で移動させた席の対応。キーが移動先(一括配置がaddSeatで新設した席id)、
  // 値が元の座席id。移動先が削除されたり他人へ再割当されたりして社員がそこから外れる時、
  // 元の座席へ配属を戻す起点にする(記録しないと動かした人がどこにも居なくなる)
  moveOrigins: Map<string, string>
  // 4種の差分の合計件数。同じ席を何度いじっても Map/Set のサイズは1のまま増えない
  changeCount: number
  // 割当の唯一の解決口。呼び出し側はここを通すだけで済み、
  // override ?? seat.employeeId のような '' 判定を各所に書かずに済む
  resolveEffectiveEmployeeId: (seatId: string, savedEmployeeId: string | null) => string | null
  // 座席追加。id は呼ばず、この場で採番して返す
  addSeat: (seat: Omit<Seat, 'id'>) => Seat
  // 座席削除。下書き追加した席そのものを消す場合は追加自体を取り消す(未確定の番号を無駄にしない)
  removeSeat: (seatId: string) => void
  // 割当変更。employeeId が null なら空席化
  assignEmployee: (seatId: string, employeeId: string | null) => void
  // 回転変更
  rotateSeat: (seatId: string, rotation: Seat['rotation']) => void
  // STEP C3: 移動先(destSeatId)と元の座席(originSeatId)の対応を記録する。
  // 一括配置がaddSeatで新設した席にだけ呼ぶ想定で、既存席を移動先にはしない
  recordMoveOrigin: (destSeatId: string, originSeatId: string) => void
  // 差分を全て破棄する
  clearDraft: () => void
}

export const useSeatDraftState = (): SeatDraftState => {
  const [assignmentsOverride, setAssignmentsOverride] = useState<Map<string, string>>(new Map())
  const [addedSeats, setAddedSeats] = useState<Seat[]>([])
  const [removedSeatIds, setRemovedSeatIds] = useState<Set<string>>(new Set())
  const [rotationOverrides, setRotationOverrides] = useState<Map<string, Seat['rotation']>>(new Map())
  const [moveOrigins, setMoveOrigins] = useState<Map<string, string>>(new Map())
  // 追加席の連番。clearDraft でのみ 0 へ戻す
  const draftIdCounterRef = useRef(0)

  const resolveEffectiveEmployeeId = useCallback(
    (seatId: string, savedEmployeeId: string | null): string | null => {
      const override = assignmentsOverride.get(seatId)
      if (override === undefined) return savedEmployeeId
      return override === '' ? null : override
    },
    [assignmentsOverride]
  )

  const addSeat = useCallback((seat: Omit<Seat, 'id'>): Seat => {
    draftIdCounterRef.current += 1
    const draft: Seat = { ...seat, id: `${DRAFT_SEAT_ID_PREFIX}${draftIdCounterRef.current}` }
    setAddedSeats((prev) => [...prev, draft])
    return draft
  }, [])

  // 割当そのものの適用だけを担う内部処理。addedSeats分岐/assignmentsOverride分岐は
  // assignEmployeeと共通なので、下のrestoreMoveOrigin(移動先が外れる時の元席復元)からも
  // 同じ判定基準を再利用できるよう分けておく
  const applyAssignment = useCallback(
    (seatId: string, employeeId: string | null) => {
      if (addedSeats.some((s) => s.id === seatId)) {
        setAddedSeats((prev) => prev.map((s) => (s.id === seatId ? { ...s, employeeId } : s)))
        return
      }
      setAssignmentsOverride((prev) => {
        const next = new Map(prev)
        next.set(seatId, employeeId === null ? '' : employeeId)
        return next
      })
    },
    [addedSeats]
  )

  // destSeatIdがmoveOriginsの移動先なら、そこに座っていた社員を元の座席へ戻してから記録を消す。
  // 呼び出し元は「移動先の配属が変わる」経路(assignEmployee/removeSeat)の先頭で必ず通す
  const restoreMoveOrigin = useCallback(
    (destSeatId: string, nextEmployeeId: string | null) => {
      const originSeatId = moveOrigins.get(destSeatId)
      if (!originSeatId) return
      const movedEmployeeId = addedSeats.find((s) => s.id === destSeatId)?.employeeId ?? null
      if (movedEmployeeId && movedEmployeeId !== nextEmployeeId) {
        applyAssignment(originSeatId, movedEmployeeId)
      }
      setMoveOrigins((prev) => {
        if (!prev.has(destSeatId)) return prev
        const next = new Map(prev)
        next.delete(destSeatId)
        return next
      })
    },
    [moveOrigins, addedSeats, applyAssignment]
  )

  const removeSeat = useCallback(
    (seatId: string) => {
      restoreMoveOrigin(seatId, null)
      // 下書き追加そのものを消す場合は removedSeatIds に積まず、追加を取り消すだけにする
      // (保存済みレイアウトに存在しない id を削除差分として残さないため)
      if (addedSeats.some((s) => s.id === seatId)) {
        setAddedSeats((prev) => prev.filter((s) => s.id !== seatId))
        return
      }
      setRemovedSeatIds((prev) => {
        if (prev.has(seatId)) return prev
        const next = new Set(prev)
        next.add(seatId)
        return next
      })
      // 削除する席の割当・回転差分は意味を失うので一緒に畳む(同じ席へ二重に差分を残さない)
      setAssignmentsOverride((prev) => {
        if (!prev.has(seatId)) return prev
        const next = new Map(prev)
        next.delete(seatId)
        return next
      })
      setRotationOverrides((prev) => {
        if (!prev.has(seatId)) return prev
        const next = new Map(prev)
        next.delete(seatId)
        return next
      })
    },
    [addedSeats, restoreMoveOrigin]
  )

  const assignEmployee = useCallback(
    (seatId: string, employeeId: string | null) => {
      // 下書き追加した席は差分 Map を経由せず、追加した Seat 自身を書き換える
      // (同じ概念の判定基準を保存済み座席と下書き座席の二重に持たないため)。moveOrigins の
      // 移動先が上書きされる時だけ、先に元の座席へ配属を戻してから通常の適用を進める
      restoreMoveOrigin(seatId, employeeId)
      applyAssignment(seatId, employeeId)
    },
    [restoreMoveOrigin, applyAssignment]
  )

  const rotateSeat = useCallback(
    (seatId: string, rotation: Seat['rotation']) => {
      if (addedSeats.some((s) => s.id === seatId)) {
        setAddedSeats((prev) => prev.map((s) => (s.id === seatId ? { ...s, rotation } : s)))
        return
      }
      setRotationOverrides((prev) => {
        const next = new Map(prev)
        next.set(seatId, rotation)
        return next
      })
    },
    [addedSeats]
  )

  // STEP C3: 部署一括配置がaddSeatで新設した席(destSeatId)と、そこへ移動してきた社員の
  // 元の座席(originSeatId)を対応づける。moveOrigins自体はchangeCountに数えない
  // (実際の変更はaddedSeats/assignmentsOverride側に既に計上されているため、二重計上を避ける)
  const recordMoveOrigin = useCallback((destSeatId: string, originSeatId: string) => {
    setMoveOrigins((prev) => {
      const next = new Map(prev)
      next.set(destSeatId, originSeatId)
      return next
    })
  }, [])

  const clearDraft = useCallback(() => {
    setAssignmentsOverride(new Map())
    setAddedSeats([])
    setRemovedSeatIds(new Set())
    setRotationOverrides(new Map())
    setMoveOrigins(new Map())
    draftIdCounterRef.current = 0
  }, [])

  const changeCount =
    assignmentsOverride.size + addedSeats.length + removedSeatIds.size + rotationOverrides.size

  return {
    assignmentsOverride,
    addedSeats,
    removedSeatIds,
    rotationOverrides,
    moveOrigins,
    changeCount,
    resolveEffectiveEmployeeId,
    addSeat,
    removeSeat,
    assignEmployee,
    rotateSeat,
    recordMoveOrigin,
    clearDraft,
  }
}
