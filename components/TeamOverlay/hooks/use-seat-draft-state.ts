import { useCallback, useRef, useState } from 'react'
import { buildSeatByEmployee } from '@/components/EmployeeAssignSheet/hooks/use-employee-assign'
import type { Seat } from '@/types'

// 座席編集(STEP A2)の下書き差分。UI・グリッド演算・保存処理は他 STEP の担当で、
// ここは「今どこがどう変わっているか」を4本の独立した容れ物で持つだけ。
// 1つの巨大オブジェクトにまとめると件数計上も取り消しも複雑になるため分けている

// 下書きで追加した座席の仮 id。確定 id はレイアウト側の採番口が振るため、
// ここでは「まだ確定していない」と分かる接頭辞だけを持つ
const DRAFT_SEAT_ID_PREFIX = 'seat-draft-'

// 判定の土台になる座席2種。どちらも算出元は use-draft-applied-seats の1本で、
// この容れ物は自前で座席配列を組み立て直さない(同じ概念の判定基準を二重に作らないため)
type SeatDraftSeatSources = {
  // 保存済みの全座席。差し引きゼロ(保存値と同じ値へ戻した)の判定に使う
  saved: Seat[]
  // 下書きを反映した全座席。社員が今どこに座っているかの解決に使う
  resolved: Seat[]
}

// 2つのid集合が同じ内容か(順序は問わない)。§06-3のgrid移動席数の差し引きゼロ判定にしか
// 使わないためこのファイル内に閉じる
const isSameIdSet = (a: Set<string>, b: Set<string>): boolean => {
  if (a.size !== b.size) return false
  for (const id of a) {
    if (!b.has(id)) return false
  }
  return true
}

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
  // §06-3: 現在baseline(編集開始時のグリッド)からセル位置が動いている座席idの集合。
  // grid自体(セル配置)はこの容れ物の外(use-overlay-edit-mode)にあるため、baselineとの
  // 差分計算はそちら側の担当。ここはsyncMovedSeatIdsで渡された結果を持つだけ
  movedSeatIds: Set<string>
  // §06-2 座席モード: フリーアドレス設定(チーム属性 Team.freeAddressEnabled)の差分。
  // null は「差分なし」。座席ではなくチーム属性なので、上の座席差分とは別の容れ物で持つ
  freeAddressOverride: boolean | null
  // 差分の合計件数(4種の座席差分+グリッド移動席数+フリーアドレス変更なら1)。同じ席を
  // 何度いじっても Map/Set のサイズは1のまま増えない
  changeCount: number
  // 割当の唯一の解決口。呼び出し側はここを通すだけで済み、
  // override ?? seat.employeeId のような '' 判定を各所に書かずに済む
  resolveEffectiveEmployeeId: (seatId: string, savedEmployeeId: string | null) => string | null
  // 座席追加。id は呼ばず、この場で採番して返す
  addSeat: (seat: Omit<Seat, 'id'>) => Seat
  // 座席削除。下書き追加した席そのものを消す場合は追加自体を取り消す(未確定の番号を無駄にしない)
  removeSeat: (seatId: string) => void
  // 割当変更。employeeId が null なら空席化。その社員が既に他の席に居るなら、
  // 保存時のリデューサー(seat-assign-employee)と同じ規則で元席を空けてから入れる
  assignEmployee: (seatId: string, employeeId: string | null) => void
  // 回転変更
  rotateSeat: (seatId: string, rotation: Seat['rotation']) => void
  // §06-2: フリーアドレス設定の現在値。保存値を引数で受けるのは resolveEffectiveEmployeeId と
  // 同じ理由 — 保存済みチームを知っているのは呼び出し側で、ここに2つ目の出所を作らない
  resolveFreeAddressEnabled: (savedFreeAddressEnabled: boolean) => boolean
  // §06-2: フリーアドレス設定の切り替え。保存値と同じ値へ戻ったら差分を落とす
  // (割当・回転と同じ規則。行き来しただけの差し引きゼロを「変更あり」で残さない)
  toggleFreeAddress: (savedFreeAddressEnabled: boolean) => void
  // 判定の土台(保存済み・下書き反映後の全座席)を受け取る唯一の口。use-draft-applied-seats が
  // 算出したものを毎レンダー渡す。渡らない間は元席の空席化・差し引きゼロ判定が働かないだけで、
  // 差分の記録そのものは従来どおり動く
  syncSeatSources: (sources: SeatDraftSeatSources) => void
  // STEP C3: 移動先(destSeatId)と元の座席(originSeatId)の対応を記録する。
  // 一括配置がaddSeatで新設した席にだけ呼ぶ想定で、既存席を移動先にはしない
  recordMoveOrigin: (destSeatId: string, originSeatId: string) => void
  // §06-3: movedSeatIdsの唯一の書き込み口。syncSeatSourcesと同じ「外で計算済みの値を渡すだけの
  // 受け口」方針だが、こちらはchangeCount(=描画)に使うためrefではなくstateで持つ。
  // 呼び出し側(baselineグリッドと現在グリッドを両方持つuse-overlay-edit-mode、担当外)が
  // レンダー毎に「今baselineから動いている座席id集合」を渡す想定
  syncMovedSeatIds: (ids: Set<string>) => void
  // 差分を全て破棄する
  clearDraft: () => void
}

export const useSeatDraftState = (): SeatDraftState => {
  const [assignmentsOverride, setAssignmentsOverride] = useState<Map<string, string>>(new Map())
  const [addedSeats, setAddedSeats] = useState<Seat[]>([])
  const [removedSeatIds, setRemovedSeatIds] = useState<Set<string>>(new Set())
  const [rotationOverrides, setRotationOverrides] = useState<Map<string, Seat['rotation']>>(new Map())
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
      const value = employeeId === null ? '' : employeeId
      // 保存値と同じ割当へ戻ったら差分を積まずに落とす。積んだままだと、行き来して元に戻しただけの
      // 差し引きゼロが「変更あり」として残り、保存ボタンが押せてしまう
      const savedSeat = seatSourcesRef.current.saved.find((s) => s.id === seatId)
      const isSameAsSaved = savedSeat !== undefined && (savedSeat.employeeId ?? '') === value
      setAssignmentsOverride((prev) => {
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
    setMoveOrigins((prev) => {
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
      const movedEmployeeId = addedSeats.find((s) => s.id === destSeatId)?.employeeId ?? null
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

  // 下書き追加した席は差分 Map を経由せず、追加した Seat 自身を書き換える
  // (同じ概念の判定基準を保存済み座席と下書き座席の二重に持たないため)。
  // 元席の空け方は保存時のリデューサー(utils/layout/layout-actions.ts の seat-assign-employee)と同じ規則に
  // 揃える — 規則が2種類あると、編集中に見えている絵と保存結果が食い違う
  const assignEmployee = useCallback(
    (seatId: string, employeeId: string | null) => {
      const { resolved } = seatSourcesRef.current
      const targetSeat = resolved.find((s) => s.id === seatId) ?? null
      // 同じ人を入れ直すだけなら何もしない(リデューサー冒頭の早期returnと同じ)
      if (targetSeat !== null && targetSeat.employeeId === employeeId) return
      // moveOrigins の移動先が上書きされる時だけ、先に元の座席へ配属を戻してから適用を進める
      const restored = restoreMoveOrigin(seatId, employeeId)
      // その社員が下書き反映後に座っている席。元席を空け、移動先に居た人はそこへ入れ替える
      const fromSeat = employeeId === null ? null : buildSeatByEmployee(resolved).get(employeeId) ?? null
      if (fromSeat && fromSeat.id !== seatId) {
        // 移動先に居た人が既に元席へ戻されている場合、ここで置き直すと同じ人が2席に居ることになる
        const displaced = restored ? null : targetSeat?.employeeId ?? null
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
      if (addedSeats.some((s) => s.id === seatId)) {
        setAddedSeats((prev) => prev.map((s) => (s.id === seatId ? { ...s, rotation } : s)))
        return
      }
      // 割当と同じく、保存値と同じ角度へ戻ったら差分を落とす(4回回して一周した時に変更ありとしない)
      const savedSeat = seatSourcesRef.current.saved.find((s) => s.id === seatId)
      const isSameAsSaved = savedSeat !== undefined && savedSeat.rotation === rotation
      setRotationOverrides((prev) => {
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
    setMoveOrigins((prev) => {
      const next = new Map(prev)
      next.set(destSeatId, originSeatId)
      return next
    })
  }, [])

  // §06-3: movedSeatIdsは呼び出し側がbaseline比較の結果をレンダー毎に渡す想定(syncSeatSourcesと
  // 同じ形)。中身が同じなら同じMap/Set参照を保つ他の差分と同様、内容が変わらない限り新しい
  // Setに差し替えない(不要な再レンダーを避ける)
  const syncMovedSeatIds = useCallback((ids: Set<string>) => {
    setMovedSeatIds((prev) => (isSameIdSet(prev, ids) ? prev : ids))
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
