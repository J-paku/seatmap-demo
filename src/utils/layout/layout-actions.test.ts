import { describe, it, expect } from 'vitest'
import { applyLayoutAction, nextSequentialId } from './layout-actions'
import type { Facility, Furniture, Seat, SeatLayout, Team } from '@/types'

const seat = (overrides: Partial<Seat> = {}): Seat => ({
  id: 'team-01-001',
  teamId: 'team-01',
  x: 0,
  y: 0,
  width: 105,
  height: 75,
  rotation: 0,
  employeeId: null,
  ...overrides,
})

const team = (overrides: Partial<Team> = {}): Team => ({
  id: 'team-01',
  idPrefix: 'team-01',
  name: 'チームA',
  color: '#ff0000',
  area: { x: 0, y: 0, w: 300, h: 200 },
  ...overrides,
})

const facility = (overrides: Partial<Facility> = {}): Facility => ({
  id: 'fac-01',
  name: '会議室1',
  kind: 'meeting',
  x: 0,
  y: 0,
  width: 120,
  height: 90,
  ...overrides,
})

const furniture = (overrides: Partial<Furniture> = {}): Furniture => ({
  id: 'furn-001',
  kind: 'sofa',
  name: 'ソファ',
  x: 0,
  y: 0,
  width: 40,
  height: 30,
  ...overrides,
})

const emptyLayout: SeatLayout = {
  floorId: 'f1',
  floorName: 'Floor 1',
  viewBox: { width: 1600, height: 1154 },
  seats: [],
  teams: [],
  facilities: [],
  furniture: [],
}

describe('nextSequentialId', () => {
  it('既存id無しなら 1 から採番する', () => {
    expect(nextSequentialId([], 'fac-', 2)).toBe('fac-01')
  })

  it('既存の最大値+1をゼロ埋めで採番する', () => {
    expect(nextSequentialId(['fac-01', 'fac-03'], 'fac-', 2)).toBe('fac-04')
  })

  it('接頭辞が一致しないidは採番の母集団から除外する', () => {
    expect(nextSequentialId(['other-99', 'fac-01'], 'fac-', 2)).toBe('fac-02')
  })

  it('接頭辞の正規表現特殊文字はエスケープされ、リテラル一致だけを見る', () => {
    // 'a.b-' の '.' はワイルドカードではなく文字通りの一致のみ対象。'axb-99' は接頭辞不一致で無視される
    expect(nextSequentialId(['a.b-01', 'axb-99'], 'a.b-', 2)).toBe('a.b-02')
  })

  it('pad 桁数どおりにゼロ埋めする(3桁)', () => {
    expect(nextSequentialId(['furn-005'], 'furn-', 3)).toBe('furn-006')
  })
})

describe('applyLayoutAction: seat-move', () => {
  it('対象座席の x/y を更新する', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1', x: 0, y: 0 })] }
    const next = applyLayoutAction(layout, { type: 'seat-move', seatId: 's-1', x: 40, y: 60 })
    expect(next.seats[0]).toMatchObject({ x: 40, y: 60 })
  })

  it('存在しない座席idなら同一参照を返す(no-op)', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1' })] }
    const next = applyLayoutAction(layout, { type: 'seat-move', seatId: 'no-such', x: 1, y: 1 })
    expect(next).toBe(layout)
  })
})

describe('applyLayoutAction: seat-add', () => {
  it('チームが存在しなければ同一参照を返す', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team({ id: 'team-01' })] }
    const next = applyLayoutAction(layout, { type: 'seat-add', teamId: 'no-such-team' })
    expect(next).toBe(layout)
  })

  it('x/y を明示すればその位置にそのまま追加する', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team()] }
    const next = applyLayoutAction(layout, { type: 'seat-add', teamId: 'team-01', x: 500, y: 600 })
    expect(next.seats).toHaveLength(1)
    expect(next.seats[0]).toMatchObject({ x: 500, y: 600, teamId: 'team-01', width: 105, height: 75, rotation: 0, employeeId: null })
  })

  it('x/y 省略・既存座席なしなら team.area の左上+パディング(20)に置く', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team({ area: { x: 0, y: 0, w: 300, h: 200 } })] }
    const next = applyLayoutAction(layout, { type: 'seat-add', teamId: 'team-01' })
    expect(next.seats[0]).toMatchObject({ x: 20, y: 20 })
  })

  it('x/y 省略・既存座席ありなら最後の座席の右隣(幅+18px)に置く', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      teams: [team()],
      seats: [seat({ id: 'team-01-001', x: 0, y: 0, width: 105, height: 75 })],
    }
    const next = applyLayoutAction(layout, { type: 'seat-add', teamId: 'team-01' })
    const added = next.seats.find((s) => s.id !== 'team-01-001')
    expect(added).toMatchObject({ x: 105 + 18, y: 0 })
  })

  it('採番は既存座席idの最大連番+1をゼロ埋め3桁で行う', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      teams: [team()],
      seats: [seat({ id: 'team-01-001' }), seat({ id: 'team-01-004' })],
    }
    const next = applyLayoutAction(layout, { type: 'seat-add', teamId: 'team-01', x: 1, y: 1 })
    const added = next.seats.find((s) => s.x === 1 && s.y === 1)
    expect(added?.id).toBe('team-01-005')
  })

  it('追加後、team.area は座席群にフィットさせ直す', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team({ area: { x: 0, y: 0, w: 300, h: 200 } })] }
    const next = applyLayoutAction(layout, { type: 'seat-add', teamId: 'team-01' })
    // 追加座席 (20,20,105,75) の bbox+20 パディング、最小200×100でクランプ
    expect(next.teams[0].area).toEqual({ x: 0, y: 0, w: 200, h: 115 })
  })
})

describe('applyLayoutAction: seat-assign-employee', () => {
  it('対象座席が無ければ同一参照', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1' })] }
    const next = applyLayoutAction(layout, { type: 'seat-assign-employee', seatId: 'no-such', employeeId: 'e1' })
    expect(next).toBe(layout)
  })

  it('既に同じemployeeIdが入っていれば同一参照(no-op)', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1', employeeId: 'e1' })] }
    const next = applyLayoutAction(layout, { type: 'seat-assign-employee', seatId: 's-1', employeeId: 'e1' })
    expect(next).toBe(layout)
  })

  it('誰も座っていない社員を空席へ配属する(他席に影響しない)', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      seats: [seat({ id: 's-1', employeeId: null }), seat({ id: 's-2', employeeId: 'e2' })],
    }
    const next = applyLayoutAction(layout, { type: 'seat-assign-employee', seatId: 's-1', employeeId: 'e3' })
    expect(next.seats.find((s) => s.id === 's-1')?.employeeId).toBe('e3')
    expect(next.seats.find((s) => s.id === 's-2')?.employeeId).toBe('e2')
  })

  it('既に別席に座っている社員を配属すると、移動元には元居た人が入れ替わる', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      seats: [seat({ id: 's-1', employeeId: 'e1' }), seat({ id: 's-2', employeeId: 'e2' })],
    }
    const next = applyLayoutAction(layout, { type: 'seat-assign-employee', seatId: 's-1', employeeId: 'e2' })
    expect(next.seats.find((s) => s.id === 's-1')?.employeeId).toBe('e2')
    expect(next.seats.find((s) => s.id === 's-2')?.employeeId).toBe('e1')
  })

  it('employeeId に null を渡すと単純に空席化し、他席は変わらない', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      seats: [seat({ id: 's-1', employeeId: 'e1' }), seat({ id: 's-2', employeeId: 'e2' })],
    }
    const next = applyLayoutAction(layout, { type: 'seat-assign-employee', seatId: 's-1', employeeId: null })
    expect(next.seats.find((s) => s.id === 's-1')?.employeeId).toBeNull()
    expect(next.seats.find((s) => s.id === 's-2')?.employeeId).toBe('e2')
  })
})

describe('applyLayoutAction: seat-delete / seat-delete-many', () => {
  it('seat-delete: 対象座席を除去する', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1' }), seat({ id: 's-2' })] }
    const next = applyLayoutAction(layout, { type: 'seat-delete', seatId: 's-1' })
    expect(next.seats.map((s) => s.id)).toEqual(['s-2'])
  })

  it('seat-delete: 存在しないidは同一参照', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1' })] }
    const next = applyLayoutAction(layout, { type: 'seat-delete', seatId: 'no-such' })
    expect(next).toBe(layout)
  })

  it('seat-delete-many: 複数idをまとめて除去する', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      seats: [seat({ id: 's-1' }), seat({ id: 's-2' }), seat({ id: 's-3' })],
    }
    const next = applyLayoutAction(layout, { type: 'seat-delete-many', seatIds: ['s-1', 's-3'] })
    expect(next.seats.map((s) => s.id)).toEqual(['s-2'])
  })

  it('seat-delete-many: 1件も一致しなければ同一参照', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1' })] }
    const next = applyLayoutAction(layout, { type: 'seat-delete-many', seatIds: ['no-1', 'no-2'] })
    expect(next).toBe(layout)
  })
})

describe('applyLayoutAction: seat-rotate', () => {
  it('0→90→180→270→0 の順で時計回りに進む', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1', rotation: 0 })] }
    let cur = layout
    const expected = [90, 180, 270, 0]
    for (const deg of expected) {
      cur = applyLayoutAction(cur, { type: 'seat-rotate', seatIds: ['s-1'] })
      expect(cur.seats[0].rotation).toBe(deg)
    }
  })

  it('対象外の座席は回転しない', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      seats: [seat({ id: 's-1', rotation: 0 }), seat({ id: 's-2', rotation: 0 })],
    }
    const next = applyLayoutAction(layout, { type: 'seat-rotate', seatIds: ['s-1'] })
    expect(next.seats.find((s) => s.id === 's-2')?.rotation).toBe(0)
  })

  it('対象が1件も居なければ同一参照', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1' })] }
    const next = applyLayoutAction(layout, { type: 'seat-rotate', seatIds: ['no-such'] })
    expect(next).toBe(layout)
  })
})

describe('applyLayoutAction: seat-reshape', () => {
  it('shape 未設定の座席に standard を当てると shape フィールドが付与される(変化ありと判定)', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1', width: 105, height: 75, rotation: 0 })] }
    const next = applyLayoutAction(layout, { type: 'seat-reshape', seatIds: ['s-1'], shape: 'standard' })
    expect(next.seats[0].shape).toBe('standard')
    expect(next).not.toBe(layout)
  })

  it('既に同じ shape・同じサイズなら同一参照(no-op)', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      seats: [seat({ id: 's-1', shape: 'standard', width: 105, height: 75, rotation: 0 })],
    }
    const next = applyLayoutAction(layout, { type: 'seat-reshape', seatIds: ['s-1'], shape: 'standard' })
    expect(next).toBe(layout)
  })

  it('executive を当てると 110×90 になる', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1', rotation: 0 })] }
    const next = applyLayoutAction(layout, { type: 'seat-reshape', seatIds: ['s-1'], shape: 'executive' })
    expect(next.seats[0]).toMatchObject({ shape: 'executive', width: 110, height: 90 })
  })

  it('対象が1件も居なければ同一参照', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1' })] }
    const next = applyLayoutAction(layout, { type: 'seat-reshape', seatIds: ['no-such'], shape: 'executive' })
    expect(next).toBe(layout)
  })
})

describe('applyLayoutAction: seat-assign / seat-swap', () => {
  it('seat-assign: teamId を付け替える(id接頭辞はそのまま)', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 'team-01-001', teamId: 'team-01' })] }
    const next = applyLayoutAction(layout, { type: 'seat-assign', seatId: 'team-01-001', teamId: 'team-02' })
    expect(next.seats[0]).toMatchObject({ id: 'team-01-001', teamId: 'team-02' })
  })

  it('seat-swap: 双方のemployeeIdを入れ替える', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      seats: [seat({ id: 's-1', employeeId: 'e1' }), seat({ id: 's-2', employeeId: 'e2' })],
    }
    const next = applyLayoutAction(layout, { type: 'seat-swap', fromSeatId: 's-1', toSeatId: 's-2' })
    expect(next.seats.find((s) => s.id === 's-1')?.employeeId).toBe('e2')
    expect(next.seats.find((s) => s.id === 's-2')?.employeeId).toBe('e1')
  })

  it('seat-swap: 片方が存在しなければ同一参照', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat({ id: 's-1' })] }
    const next = applyLayoutAction(layout, { type: 'seat-swap', fromSeatId: 's-1', toSeatId: 'no-such' })
    expect(next).toBe(layout)
  })
})

describe('applyLayoutAction: seat-replace-all', () => {
  it('対象チームが無ければ同一参照', () => {
    const layout: SeatLayout = { ...emptyLayout, seats: [seat()] }
    const next = applyLayoutAction(layout, { type: 'seat-replace-all', teamId: 'no-such', seats: [] })
    expect(next).toBe(layout)
  })

  it('isPending な座席は確定させず捨てる', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team()], seats: [seat({ id: 'team-01-001' })] }
    const next = applyLayoutAction(layout, {
      type: 'seat-replace-all',
      teamId: 'team-01',
      seats: [seat({ id: 'team-01-002', isPending: true }), seat({ id: 'team-01-003' })],
    })
    expect(next.seats.map((s) => s.id)).toEqual(['team-01-003'])
  })

  it('teamId が異なる座席は対象チームへ付け替える', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team()], seats: [seat({ id: 'team-01-001' })] }
    const next = applyLayoutAction(layout, {
      type: 'seat-replace-all',
      teamId: 'team-01',
      seats: [seat({ id: 'x-001', teamId: 'other-team' })],
    })
    expect(next.seats[0]).toMatchObject({ id: 'x-001', teamId: 'team-01' })
  })

  it('既存座席があった位置に差し込み、配列順(sr-only 読み上げ順)を保つ', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      teams: [team()],
      seats: [
        seat({ id: 'other-a', teamId: 'other-team' }),
        seat({ id: 'team-01-001' }),
        seat({ id: 'team-01-002' }),
        seat({ id: 'other-b', teamId: 'other-team' }),
      ],
    }
    const next = applyLayoutAction(layout, {
      type: 'seat-replace-all',
      teamId: 'team-01',
      seats: [seat({ id: 'team-01-new-1' }), seat({ id: 'team-01-new-2' })],
    })
    expect(next.seats.map((s) => s.id)).toEqual(['other-a', 'team-01-new-1', 'team-01-new-2', 'other-b'])
  })

  it('対象チームに既存座席が無い場合は末尾へ追加する', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      teams: [team()],
      seats: [seat({ id: 'other-a', teamId: 'other-team' })],
    }
    const next = applyLayoutAction(layout, {
      type: 'seat-replace-all',
      teamId: 'team-01',
      seats: [seat({ id: 'team-01-new-1' })],
    })
    expect(next.seats.map((s) => s.id)).toEqual(['other-a', 'team-01-new-1'])
  })
})

describe('applyLayoutAction: team-move', () => {
  it('team.area と所属座席を同じ差分だけ平行移動する', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      teams: [team({ area: { x: 0, y: 0, w: 300, h: 200 } })],
      seats: [seat({ id: 's-1', teamId: 'team-01', x: 10, y: 10 })],
    }
    const next = applyLayoutAction(layout, { type: 'team-move', teamId: 'team-01', x: 50, y: 30 })
    expect(next.teams[0].area).toMatchObject({ x: 50, y: 30 })
    expect(next.seats[0]).toMatchObject({ x: 60, y: 40 })
  })

  it('所属外の座席は変更されず参照も同一のまま', () => {
    const otherSeat = seat({ id: 'other-1', teamId: 'other-team', x: 5, y: 5 })
    const layout: SeatLayout = {
      ...emptyLayout,
      teams: [team({ area: { x: 0, y: 0, w: 300, h: 200 } })],
      seats: [otherSeat],
    }
    const next = applyLayoutAction(layout, { type: 'team-move', teamId: 'team-01', x: 50, y: 30 })
    expect(next.seats[0]).toBe(otherSeat)
  })

  it('チームが存在しなければ同一参照', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team()] }
    const next = applyLayoutAction(layout, { type: 'team-move', teamId: 'no-such', x: 1, y: 1 })
    expect(next).toBe(layout)
  })
})

describe('applyLayoutAction: team-relayout', () => {
  it('チームが存在しなければ同一参照', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team()] }
    const next = applyLayoutAction(layout, { type: 'team-relayout', teamId: 'no-such', rows: 1, cols: 2 })
    expect(next).toBe(layout)
  })

  it('座席が1件も無ければ同一参照', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team()] }
    const next = applyLayoutAction(layout, { type: 'team-relayout', teamId: 'team-01', rows: 1, cols: 2 })
    expect(next).toBe(layout)
  })

  it('cols 列のグリッドに並べ直す(y→x順ソート後、行優先で配置)', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      teams: [team({ area: { x: 0, y: 0, w: 300, h: 200 } })],
      seats: [
        seat({ id: 's-1', x: 200, y: 0 }),
        seat({ id: 's-2', x: 0, y: 0 }),
        seat({ id: 's-3', x: 0, y: 100 }),
      ],
    }
    const next = applyLayoutAction(layout, { type: 'team-relayout', teamId: 'team-01', rows: 2, cols: 2 })
    // ソート後 s-2(0,0) → s-1(200,0) → s-3(0,100) の順。cols=2 なので
    // s-2: 列0行0 / s-1: 列1行0 / s-3: 列0行1
    const byId = new Map(next.seats.map((s) => [s.id, s]))
    expect(byId.get('s-2')).toMatchObject({ x: 20, y: 20 })
    expect(byId.get('s-1')).toMatchObject({ x: 20 + 105 + 18, y: 20 })
    expect(byId.get('s-3')).toMatchObject({ x: 20, y: 20 + 75 + 20 })
  })
})

describe('applyLayoutAction: team-add', () => {
  it('チーム0件から追加すると idPrefix=team-01, id=team-01 で採番される', () => {
    const next = applyLayoutAction(emptyLayout, {
      type: 'team-add',
      name: '新チーム',
      color: '#000',
      x: 0,
      y: 0,
      width: 454,
      height: 190,
    })
    expect(next.teams[0]).toMatchObject({ id: 'team-01', idPrefix: 'team-01', name: '新チーム' })
  })

  it('idPrefix の衝突を避けて空いている連番まで進める', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team({ id: 'team-02', idPrefix: 'team-02' })] }
    // layout.teams.length=1 → index開始=2 → 'team-02' は既存と衝突 → index=3 → 'team-03'
    const next = applyLayoutAction(layout, {
      type: 'team-add',
      name: '新チーム',
      color: '#000',
      x: 0,
      y: 0,
      width: 454,
      height: 190,
    })
    const added = next.teams.find((t) => t.id !== 'team-02')
    expect(added?.idPrefix).toBe('team-03')
  })

  it('新規チームは8席(2行4列)を全て空席で連れてくる', () => {
    const next = applyLayoutAction(emptyLayout, {
      type: 'team-add',
      name: '新チーム',
      color: '#000',
      x: 100,
      y: 100,
      width: 454,
      height: 190,
    })
    expect(next.seats).toHaveLength(8)
    expect(next.seats.every((s) => s.employeeId === null)).toBe(true)
    expect(next.seats.every((s) => s.teamId === next.teams[0].id)).toBe(true)
    expect(next.seats.map((s) => s.id)).toEqual([
      'team-01-001',
      'team-01-002',
      'team-01-003',
      'team-01-004',
      'team-01-005',
      'team-01-006',
      'team-01-007',
      'team-01-008',
    ])
  })
})

describe('applyLayoutAction: team-replace-all / team-import / team-delete', () => {
  it('team-replace-all: teams 配列を丸ごと差し替え、座席には触れない', () => {
    const originalSeats = [seat({ id: 's-1' })]
    const layout: SeatLayout = { ...emptyLayout, teams: [team({ id: 'team-01' })], seats: originalSeats }
    const newTeams = [team({ id: 'team-99' })]
    const next = applyLayoutAction(layout, { type: 'team-replace-all', teams: newTeams })
    expect(next.teams).toBe(newTeams)
    expect(next.seats).toBe(originalSeats)
  })

  it('team-import: teams が空なら同一参照', () => {
    const next = applyLayoutAction(emptyLayout, { type: 'team-import', teams: [], seats: [] })
    expect(next).toBe(emptyLayout)
  })

  it('team-import: チームと座席を両方積む', () => {
    const importedTeam = team({ id: 'team-imported' })
    const importedSeat = seat({ id: 'team-imported-001', teamId: 'team-imported' })
    const next = applyLayoutAction(emptyLayout, { type: 'team-import', teams: [importedTeam], seats: [importedSeat] })
    expect(next.teams).toEqual([importedTeam])
    expect(next.seats).toEqual([importedSeat])
  })

  it('team-delete: チームと所属座席(teamId基準)を両方消す', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      teams: [team({ id: 'team-01' }), team({ id: 'team-02', idPrefix: 'team-02' })],
      seats: [
        seat({ id: 'team-01-001', teamId: 'team-01' }),
        // id接頭辞は team-01 だが所属(teamId)は team-02 に付け替え済み → 消えない
        seat({ id: 'team-01-002', teamId: 'team-02' }),
      ],
    }
    const next = applyLayoutAction(layout, { type: 'team-delete', teamId: 'team-01' })
    expect(next.teams.map((t) => t.id)).toEqual(['team-02'])
    expect(next.seats.map((s) => s.id)).toEqual(['team-01-002'])
  })

  it('team-delete: 存在しないチームは同一参照', () => {
    const layout: SeatLayout = { ...emptyLayout, teams: [team()] }
    const next = applyLayoutAction(layout, { type: 'team-delete', teamId: 'no-such' })
    expect(next).toBe(layout)
  })
})

describe('applyLayoutAction: facility-add', () => {
  it('name/facilityId省略時は「会議室N」を自動採番する(既存meeting件数+1)', () => {
    const layout: SeatLayout = {
      ...emptyLayout,
      facilities: [facility({ id: 'fac-01', kind: 'meeting' }), facility({ id: 'fac-02', kind: 'booth' })],
    }
    const next = applyLayoutAction(layout, { type: 'facility-add', x: 0, y: 0, width: 100, height: 100 })
    const added = next.facilities.find((f) => f.id !== 'fac-01' && f.id !== 'fac-02')
    expect(added?.name).toBe('会議室2')
    expect(added?.kind).toBe('meeting')
  })

  it('facilityId省略時は facilityId フィールド自体を持たない(施設未連携)', () => {
    const next = applyLayoutAction(emptyLayout, { type: 'facility-add', x: 0, y: 0, width: 100, height: 100 })
    expect('facilityId' in next.facilities[0]).toBe(false)
  })

  it('name/facilityId を指定するとその値をそのまま使う(Garoonマスタ経由)', () => {
    const next = applyLayoutAction(emptyLayout, {
      type: 'facility-add',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      name: '大会議室',
      facilityId: 'garoon-42',
    })
    expect(next.facilities[0]).toMatchObject({ name: '大会議室', facilityId: 'garoon-42' })
  })

  it('id は fac- 接頭辞2桁で採番する', () => {
    const layout: SeatLayout = { ...emptyLayout, facilities: [facility({ id: 'fac-01' })] }
    const next = applyLayoutAction(layout, { type: 'facility-add', x: 0, y: 0, width: 10, height: 10 })
    expect(next.facilities.map((f) => f.id)).toContain('fac-02')
  })
})

describe('applyLayoutAction: furniture-add', () => {
  it('構造物種別(壁)は既定名が空文字になる', () => {
    const next = applyLayoutAction(emptyLayout, { type: 'furniture-add', furnitureKind: 'wall', x: 0, y: 0, width: 200, height: 20 })
    expect(next.furniture[0]).toMatchObject({ kind: 'wall', name: '' })
  })

  it('オブジェクト種別(ソファ)は既定名がカタログのラベルになる', () => {
    const next = applyLayoutAction(emptyLayout, { type: 'furniture-add', furnitureKind: 'sofa', x: 0, y: 0, width: 120, height: 60 })
    expect(next.furniture[0]).toMatchObject({ kind: 'sofa', name: 'ソファ' })
  })

  it('id は furn- 接頭辞3桁で採番する', () => {
    const layout: SeatLayout = { ...emptyLayout, furniture: [furniture({ id: 'furn-001' })] }
    const next = applyLayoutAction(layout, { type: 'furniture-add', furnitureKind: 'table', x: 0, y: 0, width: 10, height: 10 })
    expect(next.furniture.map((f) => f.id)).toContain('furn-002')
  })
})

describe('applyLayoutAction: object-move / object-resize / object-lock / object-label-visible', () => {
  it('facility を対象に x/y を更新する', () => {
    const layout: SeatLayout = { ...emptyLayout, facilities: [facility({ id: 'fac-01', x: 0, y: 0 })] }
    const next = applyLayoutAction(layout, { type: 'object-move', kind: 'facility', id: 'fac-01', x: 10, y: 20 })
    expect(next.facilities[0]).toMatchObject({ x: 10, y: 20 })
  })

  it('furniture を対象に幅・高さを含めて更新する(object-resize)', () => {
    const layout: SeatLayout = { ...emptyLayout, furniture: [furniture({ id: 'furn-001' })] }
    const next = applyLayoutAction(layout, {
      type: 'object-resize',
      kind: 'furniture',
      id: 'furn-001',
      x: 1,
      y: 2,
      width: 30,
      height: 40,
    })
    expect(next.furniture[0]).toMatchObject({ x: 1, y: 2, width: 30, height: 40 })
  })

  it('object-lock: locked フラグだけを更新し他フィールドは保持する', () => {
    const layout: SeatLayout = { ...emptyLayout, facilities: [facility({ id: 'fac-01', name: '会議室X' })] }
    const next = applyLayoutAction(layout, { type: 'object-lock', kind: 'facility', id: 'fac-01', locked: true })
    expect(next.facilities[0]).toMatchObject({ name: '会議室X', locked: true })
  })

  it('object-label-visible: labelVisible フラグを更新する', () => {
    const layout: SeatLayout = { ...emptyLayout, furniture: [furniture({ id: 'furn-001' })] }
    const next = applyLayoutAction(layout, { type: 'object-label-visible', kind: 'furniture', id: 'furn-001', labelVisible: true })
    expect(next.furniture[0]).toMatchObject({ labelVisible: true })
  })

  it('対象idが存在しなければ同一参照(facility)', () => {
    const layout: SeatLayout = { ...emptyLayout, facilities: [facility({ id: 'fac-01' })] }
    const next = applyLayoutAction(layout, { type: 'object-move', kind: 'facility', id: 'no-such', x: 1, y: 1 })
    expect(next).toBe(layout)
  })

  it('対象idが存在しなければ同一参照(furniture)', () => {
    const layout: SeatLayout = { ...emptyLayout, furniture: [furniture({ id: 'furn-001' })] }
    const next = applyLayoutAction(layout, { type: 'object-lock', kind: 'furniture', id: 'no-such', locked: true })
    expect(next).toBe(layout)
  })
})

describe('applyLayoutAction: object-delete', () => {
  it('facility を id で削除する', () => {
    const layout: SeatLayout = { ...emptyLayout, facilities: [facility({ id: 'fac-01' }), facility({ id: 'fac-02' })] }
    const next = applyLayoutAction(layout, { type: 'object-delete', kind: 'facility', id: 'fac-01' })
    expect(next.facilities.map((f) => f.id)).toEqual(['fac-02'])
  })

  it('furniture を id で削除する', () => {
    const layout: SeatLayout = { ...emptyLayout, furniture: [furniture({ id: 'furn-001' }), furniture({ id: 'furn-002' })] }
    const next = applyLayoutAction(layout, { type: 'object-delete', kind: 'furniture', id: 'furn-001' })
    expect(next.furniture.map((f) => f.id)).toEqual(['furn-002'])
  })

  it('対象idが存在しなければ同一参照', () => {
    const layout: SeatLayout = { ...emptyLayout, facilities: [facility({ id: 'fac-01' })] }
    const next = applyLayoutAction(layout, { type: 'object-delete', kind: 'facility', id: 'no-such' })
    expect(next).toBe(layout)
  })
})
