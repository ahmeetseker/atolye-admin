import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import type { SearchOptions, SearchResult } from './types'
import {
  addRecent,
  buildIndex,
  clearRecent,
  loadRecent,
  search,
} from './search-index'

/**
 * Cross-entity command palette search hook.
 *
 * - Builds the index once via `useMemo([])` (pure in-memory over static mocks).
 * - Defers the query with `useDeferredValue` so `<input>` typing never lags.
 * - Caller passes the controlled query string — typing stays at INP < 100ms.
 */
export function useAssistantSearch(
  query: string,
  opts: SearchOptions = {},
): { results: SearchResult[]; deferredQuery: string; isStale: boolean } {
  const index = useMemo(() => buildIndex(), [])
  const deferredQuery = useDeferredValue(query)

  const limit = opts.limit
  // Stable identity for `entities` so memoization is reliable.
  const entitiesKey = opts.entities ? opts.entities.join(',') : ''

  const results = useMemo(() => {
    if (!deferredQuery.trim()) return []
    return search(index, deferredQuery, {
      entities: entitiesKey ? (entitiesKey.split(',') as SearchOptions['entities']) : undefined,
      limit,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, deferredQuery, entitiesKey, limit])

  return {
    results,
    deferredQuery,
    isStale: deferredQuery !== query,
  }
}

/**
 * Recent searches stored in localStorage["arsam.admin.recent.v1"].
 * Last 5, dedupe (case-insensitive TR).
 */
export function useRecentSearches(): {
  recent: string[]
  push: (query: string) => void
  clear: () => void
} {
  const [recent, setRecent] = useState<string[]>(() => loadRecent())

  const push = useCallback((query: string) => {
    setRecent((current) => addRecent(query, current))
  }, [])

  const clear = useCallback(() => {
    clearRecent()
    setRecent([])
  }, [])

  return { recent, push, clear }
}
