// useFavorites(お気に入りの社員・部署)が使う集合の操作

export const createEmptySet = () => new Set<string>()

export const toggleSetValue = (current: Set<string>, value: string): Set<string> => {
  const next = new Set(current)

  if (next.has(value)) {
    next.delete(value)
    return next
  }

  next.add(value)
  return next
}
