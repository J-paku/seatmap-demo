import { useCallback, useRef, useState } from 'react'
import { DRAFT_SEAT_ID_PREFIX, isSameIdSet } from '../utils/track-seat-draft'
import type { SeatDraftSeatSources, SeatDraftState } from '../type'
import { buildSeatByEmployee } from '@/utils/locate-employee-seat'
import type { Seat } from '@/types'

// 座席編集(STEP A2)の下書き差分。UI・グリッド演算・保存処理は他 STEP の担当で、
// ここは「今どこがどう変わっているか」を4本の独立した容れ物で持つだけ。
// 1つの巨大オブジェクトにまとめると件数計上も取り消しも複雑になるため分けている

export const useSeatDraftState = (): SeatDraftState => {
  const [assignmentsOverride, setAssignmentsOverride] = useState<Map<string, string>>(new Map())
  const [addedSeats, setAddedSeats] = useState<Seat[]>([])
  const [removedSeatIds, setRemovedSeatIds] = useState<Set<string>>(new Set())
  const [rotationOverrides, setRotationOverrides] = useState<Map<string, Seat['rotation']>>(
    new Map()
  )
  const [moveOrigins, setMoveOrigins] = useState<Map<string, string>>(new Map())
  const [movedSeatIds, setMovedSeatIds] = useState<Set<string>>(new Set())
  // §06-2: フリーアドレス設定の差分。null=差分なし
  const [freeAddressOverride, setFreeAddressOverride] = useState<boolean | null>(null)
  // 追加席の連番。clearDraft でのみ 0 へ戻す
  const draftIdCounterRef = useRef(0)
  // 判定の土台。イベントハンドラからしか読まないため state ではなく ref で持つ
  // (state にすると土台が変わるたびに再レンダーが増えるだけで、描画には一切使わない)
  const seatSourcesRef = useRef<SeatDraftSeatSources>({ saved: [], resolved: [] })

  const syncSeatSources = useCallback((sources: SeatDraftSeatSources) => {
    seatSourcesRef.current = sources
  }, [])

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
    setAddedSeats(prev => [...prev, draft])
    return draft
  }, [])

  // 割当そのものの適用だけを担う内部処理。addedSeats分岐/assignmentsOverride分岐は
  // assignEmployeeと共通なので、下のrestoreMoveOrigin(移動先が外れる時の元席復元)からも
  // 同じ判定基準を再利用できるよう分けておく
  const applyAssignment = useCallback(
    (seatId: string, employeeId: string | null) => {
      if (addedSeats.some(s => s.id === seatId)) {
        setAddedSeats(prev => prev.map(s => (s.id === seatId ? { ...s, employeeId } : s)))
        return
      }
      const value = employeeId === null ? '' : employeeId
      // 保存値と同じ割当へ戻ったら差分を積まずに落とす。積んだままだと、行き来して元に戻しただけの
      // 差し引きゼロが「変更あり」として残り、保存ボタンが押せてしまう
      const savedSeat = seatSourcesRef.current.saved.find(s => s.id === seatId)
      const isSameAsSaved = savedSeat !== undefined && (savedSeat.employeeId ?? '') === value
      setAssignmentsOverride(prev => {
        if (isSameAsSaved) {
          if (!prev.has(seatId)) return prev
          const next = new Map(prev)
          next.delete(seatId)
          return next
        }
        if (prev.get(seatId) === value) return prev
        const next = new Map(prev)
        next.set(seatId, value)
        return next
      })
    },
    [addedSeats]
  )

  // moveOriginsの記録だけを落とす。移動先から社員が外れた後の記録は「戻す先」を指さないため、
  // 残すと後続の削除・再割当で無関係な人を元席へ送ってしまう
  const forgetMoveOrigin = useCallback((destSeatId: string) => {
    setMoveOrigins(prev => {
      if (!prev.has(destSeatId)) return prev
      const next = new Map(prev)
      next.delete(destSeatId)
      return next
    })
  }, [])

  // destSeatIdがmoveOriginsの移動先なら、そこに座っていた社員を元の座席へ戻してから記録を消す。
  // 呼び出し元は「移動先の配属が変わる」経路(assignEmployee/removeSeat)の先頭で必ず通す。
  // 戻り値は「元席へ戻したか」。戻した社員は行き先が確定しているため、呼び出し元の入れ替え処理は
  // その社員をもう置かない(置くと同じ人が2席に居ることになる)
  const restoreMoveOrigin = useCallback(
    (destSeatId: string, nextEmployeeId: string | null): boolean => {
      const originSeatId = moveOrigins.get(destSeatId)
      if (!originSeatId) return false
      const movedEmployeeId = addedSeats.find(s => s.id === destSeatId)?.employeeId ?? null
      const restores = movedEmployeeId !== null && movedEmployeeId !== nextEmployeeId
      if (restores) applyAssignment(originSeatId, movedEmployeeId)
      forgetMoveOrigin(destSeatId)
      return restores
    },
    [moveOrigins, addedSeats, applyAssignment, forgetMoveOrigin]
  )

  const removeSeat = useCallback(
    (seatId: string) => {
      restoreMoveOrigin(seatId, null)
      // 下書き追加そのものを消す場合は removedSeatIds に積まず、追加を取り消すだけにする
      // (保存済みレイアウトに存在しない id を削除差分として残さないため)
      if (addedSeats.some(s => s.id === seatId)) {
        setAddedSeats(prev => prev.filter(s => s.id !== seatId))
        return
      }
      setRemovedSeatIds(prev => {
        if (prev.has(seatId)) return prev
        const next = new Set(prev)
        next.add(seatId)
        return next
      })
      // 削除する席の割当・回転差分は意味を失うので一緒に畳む(同じ席へ二重に差分を残さない)
      setAssignmentsOverride(prev => {
        if (!prev.has(seatId)) return prev
        const next = new Map(prev)
        next.delete(seatId)
        return next
      })
      setRotationOverrides(prev => {
        if (!prev.has(seatId)) return prev
        const next = new Map(prev)
        next.delete(seatId)
        return next
      })
    },
    [addedSeats, restoreMoveOrigin]
  )

  // 下書き追加した席は差分 Map を経由せず、追加した Seat 自身を書き換える
  // (同じ概念の判定基準を保存済み座席と下書き座席の二重に持たないため)。
  // 元席の空け方は保存時のリデューサー(utils/layout/layout-actions.ts の seat-assign-employee)と同じ規則に
  // 揃える — 規則が2種類あると、編集中に見えている絵と保存結果が食い違う
  const assignEmployee = useCallback(
    (seatId: string, employeeId: string | null) => {
      const { resolved } = seatSourcesRef.current
      const targetSeat = resolved.find(s => s.id === seatId) ?? null
      // 同じ人を入れ直すだけなら何もしない(リデューサー冒頭の早期returnと同じ)
      if (targetSeat !== null && targetSeat.employeeId === employeeId) return
      // moveOrigins の移動先が上書きされる時だけ、先に元の座席へ配属を戻してから適用を進める
      const restored = restoreMoveOrigin(seatId, employeeId)
      // その社員が下書き反映後に座っている席。元席を空け、移動先に居た人はそこへ入れ替える
      const fromSeat =
        employeeId === null ? null : (buildSeatByEmployee(resolved).get(employeeId) ?? null)
      if (fromSeat && fromSeat.id !== seatId) {
        // 移動先に居た人が既に元席へ戻されている場合、ここで置き直すと同じ人が2席に居ることになる
        const displaced = restored ? null : (targetSeat?.employeeId ?? null)
        // 自分から出ていく席なので、その席のmoveOrigins(戻す先の記録)はもう用を成さない
        forgetMoveOrigin(fromSeat.id)
        applyAssignment(fromSeat.id, displaced)
      }
      applyAssignment(seatId, employeeId)
    },
    [restoreMoveOrigin, forgetMoveOrigin, applyAssignment]
  )

  const rotateSeat = useCallback(
    (seatId: string, rotation: Seat['rotation']) => {
      if (addedSeats.some(s => s.id === seatId)) {
        setAddedSeats(prev => prev.map(s => (s.id === seatId ? { ...s, rotation } : s)))
        return
      }
      // 割当と同じく、保存値と同じ角度へ戻ったら差分を落とす(4回回して一周した時に変更ありとしない)
      const savedSeat = seatSourcesRef.current.saved.find(s => s.id === seatId)
      const isSameAsSaved = savedSeat !== undefined && savedSeat.rotation === rotation
      setRotationOverrides(prev => {
        if (isSameAsSaved) {
          if (!prev.has(seatId)) return prev
          const next = new Map(prev)
          next.delete(seatId)
          return next
        }
        if (prev.get(seatId) === rotation) return prev
        const next = new Map(prev)
        next.set(seatId, rotation)
        return next
      })
    },
    [addedSeats]
  )

  // §06-2 座席モード: 保存値に上書きを重ねた現在値。上書きが無ければ保存値をそのまま返す
  // (resolveEffectiveEmployeeId と同じ形)
  const resolveFreeAddressEnabled = useCallback(
    (savedFreeAddressEnabled: boolean): boolean => freeAddressOverride ?? savedFreeAddressEnabled,
    [freeAddressOverride]
  )

  // 切り替えは現在値の反転。反転先が保存値と同じなら差分そのものを落とす — 積んだままだと
  // ON/OFFして元へ戻しただけの差し引きゼロが変更数に残り、保存ボタンが押せてしまう
  const toggleFreeAddress = useCallback(
    (savedFreeAddressEnabled: boolean) => {
      const next = !(freeAddressOverride ?? savedFreeAddressEnabled)
      setFreeAddressOverride(next === savedFreeAddressEnabled ? null : next)
    },
    [freeAddressOverride]
  )

  // STEP C3: 部署一括配置がaddSeatで新設した席(destSeatId)と、そこへ移動してきた社員の
  // 元の座席(originSeatId)を対応づける。moveOrigins自体はchangeCountに数えない
  // (実際の変更はaddedSeats/assignmentsOverride側に既に計上されているため、二重計上を避ける)
  const recordMoveOrigin = useCallback((destSeatId: string, originSeatId: string) => {
    setMoveOrigins(prev => {
      const next = new Map(prev)
      next.set(destSeatId, originSeatId)
      return next
    })
  }, [])

  // §06-3: movedSeatIdsは呼び出し側がbaseline比較の結果をレンダー毎に渡す想定(syncSeatSourcesと
  // 同じ形)。中身が同じなら同じMap/Set参照を保つ他の差分と同様、内容が変わらない限り新しい
  // Setに差し替えない(不要な再レンダーを避ける)
  const syncMovedSeatIds = useCallback((ids: Set<string>) => {
    setMovedSeatIds(prev => (isSameIdSet(prev, ids) ? prev : ids))
  }, [])

  const clearDraft = useCallback(() => {
    setAssignmentsOverride(new Map())
    setAddedSeats([])
    setRemovedSeatIds(new Set())
    setRotationOverrides(new Map())
    setMoveOrigins(new Map())
    setMovedSeatIds(new Set())
    setFreeAddressOverride(null)
    draftIdCounterRef.current = 0
  }, [])

  // §06-3: 変更数 = 配属+追加+削除+回転の差分 + グリッド移動席数(movedSeatIds)
  // + フリーアドレス変更なら+1。フリーアドレスは席数によらず1件(チーム属性1つの差分)で、
  // 保存値へ戻ると freeAddressOverride が null へ畳まれるのでこの項も消える
  const changeCount =
    assignmentsOverride.size +
    addedSeats.length +
    removedSeatIds.size +
    rotationOverrides.size +
    movedSeatIds.size +
    (freeAddressOverride === null ? 0 : 1)

  return {
    assignmentsOverride,
    addedSeats,
    removedSeatIds,
    rotationOverrides,
    moveOrigins,
    movedSeatIds,
    freeAddressOverride,
    changeCount,
    resolveEffectiveEmployeeId,
    addSeat,
    removeSeat,
    assignEmployee,
    rotateSeat,
    resolveFreeAddressEnabled,
    toggleFreeAddress,
    syncSeatSources,
    recordMoveOrigin,
    syncMovedSeatIds,
    clearDraft,
  }
}
