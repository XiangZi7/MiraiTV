import type { HistoryRecord, HistorySave } from './web-api'

export interface SearchRecord {
  keyword: string
  updatedAt: string
}

export type ActivityChange =
  | { type: 'search'; search: SearchRecord }
  | {
      type: 'history'
      history: HistorySave & {
        title: string
        poster: string | null
        updatedAt: string
      }
    }
  | { type: 'remove-search'; keyword: string }
  | { type: 'remove-history'; mediaId: string }
  | { type: 'clear-searches' | 'clear-history' }

export interface ActivityResult {
  searches: SearchRecord[]
  history: HistoryRecord[]
}

export interface ActivityCache extends ActivityResult {
  pending: { id: string; change: ActivityChange }[]
}
