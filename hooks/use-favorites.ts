import { useCallback, useEffect, useState } from 'react'
import {
  readFavoriteDepartments,
  writeFavoriteDepartments,
} from '@/lib/seat/favorite-departments'
import { readFavoriteIds, writeFavoriteIds } from '@/lib/seat/favorite-employees'

type FavoritesInitialization = 'lazy' | 'effect'

interface UseFavoritesOptions {
  initialization?: FavoritesInitialization
}

interface UseFavoritesResult {
  favoriteIds: Set<string>
  toggleFavorite: (empId: string) => void
  favoriteDeptNames: Set<string>
  toggleFavoriteDept: (dept: string) => void
}

const createEmptySet = () => new Set<string>()

const toggleSetValue = (current: Set<string>, value: string): Set<string> => {
  const next = new Set(current)

  if (next.has(value)) {
    next.delete(value)
    return next
  }

  next.add(value)
  return next
}

export function useFavorites(options: UseFavoritesOptions = {}): UseFavoritesResult {
  const { initialization = 'lazy' } = options
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() =>
    initialization === 'lazy' ? readFavoriteIds() : createEmptySet()
  )
  const [favoriteDeptNames, setFavoriteDeptNames] = useState<Set<string>>(() =>
    initialization === 'lazy' ? readFavoriteDepartments() : createEmptySet()
  )

  useEffect(() => {
    if (initialization !== 'effect') return

    // initialization=effect は hydration 一致のためのモード。マウント後の復元が仕様
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavoriteIds(readFavoriteIds())
    setFavoriteDeptNames(readFavoriteDepartments())
  }, [initialization])

  const toggleFavorite = useCallback((empId: string) => {
    setFavoriteIds(prev => {
      const next = toggleSetValue(prev, empId)
      writeFavoriteIds(next)
      return next
    })
  }, [])

  const toggleFavoriteDept = useCallback((dept: string) => {
    setFavoriteDeptNames(prev => {
      const next = toggleSetValue(prev, dept)
      writeFavoriteDepartments(next)
      return next
    })
  }, [])

  return {
    favoriteIds,
    toggleFavorite,
    favoriteDeptNames,
    toggleFavoriteDept,
  }
}
