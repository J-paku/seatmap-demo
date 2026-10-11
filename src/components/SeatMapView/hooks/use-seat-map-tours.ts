import { useCallback, useEffect, useRef, useState } from 'react'
import { MAIN_TOUR_STEPS, MAIN_TOUR_STORAGE_KEY } from '../utils/main-tour-steps'
import { isTourPlaying, readSeen, useCoachMarkTour } from '@/components/CoachMarkTour/hooks/use-coach-mark-tour'
import type { CoachMarkTourState } from '@/components/CoachMarkTour/hooks/use-coach-mark-tour'
import {
  EDIT_TOUR_BRANCH,
  EDIT_TOUR_STORAGE_KEY,
  FURNITURE_TOUR_STEPS,
  FURNITURE_TOUR_STORAGE_KEY,
  TEAM_TOUR_STEPS,
  TEAM_TOUR_STORAGE_KEY,
} from '@/components/CoachMarkTour/utils/tour-steps'
import type { GhostRequest } from '@/components/GhostPlacementLayer'

// 座席マップ画面が同時に抱える4本の操作ガイドを1箇所に束ねる。
//
// エンジン(useCoachMarkTour)は isActive を直接受けないので、活性化(初回自動再生・
// 退出時に畳む・導線ごとの出し分け)は呼び出し側の責務になる。それが4本ぶん散らばると
// 画面の組み立てから「どのガイドがいつ出るか」が読めなくなるため、ここへ集約する

type Options = {
  isEditMode: boolean
  // コーチマークの対象が画面外のとき、その要素をキャンバス中央へ寄せる
  centerOnSelector: (selector: string) => void
  // いま配置フローが運んでいる対象種別。「?」でどのガイドを出すかの唯一の判断材料
  placementTargetType: GhostRequest['target']['type'] | undefined
}

export type SeatMapTours = {
  editTour: CoachMarkTourState
  mainTour: CoachMarkTourState
  teamTour: CoachMarkTourState
  furnitureTour: CoachMarkTourState
  // FAB の可否判定へ渡す全インスタンス
  tours: readonly CoachMarkTourState[]
  // フロー導線(チーム/家具)のガイドが再生中か。編集・メインの層を描くかの判定に使う
  isFlowTourPlaying: boolean
  replayMainTour: () => void
  handleHelp: () => void
  // FAB の「チーム」「設備」を押した時。未読ならガイドを1回だけ出し、
  // 同じ操作で起きる編集セッションのガイドは1遷移ぶんだけ抑止する
  beginTeamFlow: () => void
  beginFacilityFlow: () => void
}

export const useSeatMapTours = ({ isEditMode, centerOnSelector, placementTargetType }: Options): SeatMapTours => {
  // 編集セッションのガイド。編集モード初回だけ自動再生し、? ボタンで何度でも見られる
  const [editNonce, setEditNonce] = useState(0)
  const editTour = useCoachMarkTour({
    branch: EDIT_TOUR_BRANCH,
    storageKey: EDIT_TOUR_STORAGE_KEY,
    replayNonce: editNonce,
    autoStart: false,
    centerOnSelector,
  })
  const replayEditTour = useCallback(() => setEditNonce((count) => count + 1), [])

  // §05-7: FABの「チーム」「設備」はそれぞれ独立フロー+独立キーを持つ。どちらもゴーストが
  // 画面中央に出るのでスポットライトする対象が無く、中央カードのまま3ステップ流すだけになる。
  // 自動再生の判定は「メニュー項目を選んだ時点」(§01)で行うので、マウント時の autoStart は切る
  const [teamNonce, setTeamNonce] = useState(0)
  const teamTour = useCoachMarkTour({
    steps: TEAM_TOUR_STEPS,
    storageKey: TEAM_TOUR_STORAGE_KEY,
    replayNonce: teamNonce,
    autoStart: false,
  })
  const replayTeamTour = useCallback(() => setTeamNonce((count) => count + 1), [])

  const [furnitureNonce, setFurnitureNonce] = useState(0)
  const furnitureTour = useCoachMarkTour({
    steps: FURNITURE_TOUR_STEPS,
    storageKey: FURNITURE_TOUR_STORAGE_KEY,
    replayNonce: furnitureNonce,
    autoStart: false,
  })
  const replayFurnitureTour = useCallback(() => setFurnitureNonce((count) => count + 1), [])

  // メイン(閲覧)画面の使い方ガイド。編集ツアーとは別インスタンス・別 storageKey で、
  // 初回未読なら自動再生(autoStart 既定 true)、以降はヘッダーの使い方ガイドボタンで再生する
  const [mainNonce, setMainNonce] = useState(0)
  const mainTour = useCoachMarkTour({
    steps: MAIN_TOUR_STEPS,
    storageKey: MAIN_TOUR_STORAGE_KEY,
    replayNonce: mainNonce,
    centerOnSelector,
  })
  const replayMainTour = useCallback(() => setMainNonce((count) => count + 1), [])

  const wasEditModeRef = useRef(isEditMode)
  // FABの「チーム」「設備」は自分のガイドを予約する。同じ操作で編集セッションも起きるため、
  // この遷移1回ぶんだけ編集ガイドの自動再生を止める。既読化はしないので、
  // あとから「レイアウトを編集」や長押しで入り直せば編集ガイドは通常どおり出る
  const suppressEditTourOnceRef = useRef(false)
  const collapseEditTour = editTour.collapse
  useEffect(() => {
    const wasEditMode = wasEditModeRef.current
    wasEditModeRef.current = isEditMode
    if (isEditMode) {
      const suppressed = suppressEditTourOnceRef.current
      suppressEditTourOnceRef.current = false
      // 編集モードへ初めて入った時だけ、未読なら自動再生する。
      // ただしFAB導線が自分のガイドを出す遷移では出さない(暗幕が2枚になる)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!wasEditMode && !suppressed && !readSeen(EDIT_TOUR_STORAGE_KEY)) replayEditTour()
      return
    }
    // 編集モードを抜けたらツアーも畳む。画面都合の折りたたみなので既読化はしない(collapse)。
    // 一度も操作していないツアーを close で既読化すると、次に編集モードへ入っても自動再生されなくなる
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wasEditMode) collapseEditTour()
  }, [isEditMode, replayEditTour, collapseEditTour])

  // 抑止の目印は「直前の1コミット」だけ有効。編集セッションが起きなかった場合はここで捨てる。
  // 持ち越すと、あとで正当に編集モードへ入った時のガイドまで止めてしまう
  useEffect(() => {
    suppressEditTourOnceRef.current = false
  })

  // §05-7:「?」は今居る導線のガイドを再生する。掴み直し(reposition)と未配置(undefined)は
  // レイアウト編集の導線なので分岐ツアーを出す
  const handleHelp = useCallback(() => {
    if (placementTargetType === 'add-team') replayTeamTour()
    else if (placementTargetType === 'add-furniture' || placementTargetType === 'add-facility') replayFurnitureTour()
    else replayEditTour()
  }, [placementTargetType, replayTeamTour, replayFurnitureTour, replayEditTour])

  // §01の「メニュー項目を選んだ時点」。既読化はツアーを閉じた時にエンジン側が行う
  const beginTeamFlow = useCallback(() => {
    if (readSeen(TEAM_TOUR_STORAGE_KEY)) return
    // 閲覧モードから押した時だけ編集セッションへの遷移が起きる。既に編集中なら遷移が無く、
    // 目印を立てると後の遷移まで持ち越してしまうので立てない
    if (!isEditMode) suppressEditTourOnceRef.current = true
    replayTeamTour()
  }, [isEditMode, replayTeamTour])

  const beginFacilityFlow = useCallback(() => {
    if (readSeen(FURNITURE_TOUR_STORAGE_KEY)) return
    if (!isEditMode) suppressEditTourOnceRef.current = true
    replayFurnitureTour()
  }, [isEditMode, replayFurnitureTour])

  return {
    editTour,
    mainTour,
    teamTour,
    furnitureTour,
    tours: [editTour, mainTour, teamTour, furnitureTour],
    isFlowTourPlaying: isTourPlaying(teamTour) || isTourPlaying(furnitureTour),
    replayMainTour,
    handleHelp,
    beginTeamFlow,
    beginFacilityFlow,
  }
}
