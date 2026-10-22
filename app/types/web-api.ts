/** Web BFF 的页面响应。路径与调用示例见 service/docs/web-api.md。 */
import type {
  CastMember,
  Collection,
  Episode,
  MediaItem,
  PosterTint,
  ScheduleItem,
  UserProfile,
  WatchRecord,
} from './media'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

export interface MediaPage {
  items: MediaItem[]
  /** 本地筛选后的总数未知时为 null */
  total: number | null
  nextCursor: string | null
  hasMore: boolean
  partial: boolean
}

export interface CatalogQuery {
  provider?: string
  kind?: NonNullable<MediaItem['kind']>
  year?: number
  genre?: string
  region?: string
  minRating?: number
  sort?: 'latest' | 'rating' | 'popular'
  pageSize?: number
  cursor?: string
}

export interface MetadataProviderInfo {
  key: string
  name: string
  kinds: NonNullable<MediaItem['kind']>[]
  sorts: string[]
  supportsSchedule: boolean
}

export interface ScheduleResult {
  items: ScheduleItem[]
  /** 周一至周日，YYYY-MM-DD */
  weekDates: string[]
  timezone: string
  partial: boolean
  unavailableProviders: string[]
}

export interface HomeResult {
  hero: MediaItem[]
  weeklySchedule: ScheduleItem[]
  editorsPick: { feature: MediaItem | null; related: MediaItem[] }
  popularMovies: MediaItem[]
  sections: {
    key: string
    title: string
    kicker?: string | null
    items: MediaItem[]
  }[]
  partial: boolean
  unavailableSections: string[]
}

export interface SearchSuggestions {
  trending: string[]
  recommendations: MediaItem[]
}

export interface MediaDetail {
  media: MediaItem
  /** 元数据分集 ID 不能直接用于视频源播放 */
  episodes: Episode[]
  cast: CastMember[]
  stills: string[]
  related: MediaItem[]
  partial: boolean
  unavailableSections: string[]
}

export interface SourceEpisode {
  id: string
  index: number | null
  title: string
  durationSeconds: number | null
  lines: { id: string; name: string; episodeId: string }[]
}

export interface PlaybackMatch {
  source: string
  sourceName: string
  seriesId: string
  title: string
  confidence: number
  episodes: SourceEpisode[]
}

export interface PlaybackSources {
  mediaId: string
  available: boolean
  matches: PlaybackMatch[]
  partial: boolean
  unavailableSources: string[]
  message: string | null
}

export interface PlaybackResult {
  mediaId: string
  source: string
  episode: SourceEpisode
  line: string | null
  urls: { quality: string; url: string; size: number | null }[]
  subtitles: {
    language: string | null
    label: string | null
    url: string
    isDefault: boolean
  }[]
  expireAt: number | null
  headers: Record<string, string>
}

export interface FavoriteSave {
  mediaId: string
  notifyEnabled?: boolean
}

export interface FavoriteItem extends MediaItem {
  notifyEnabled: boolean
}

export interface HistorySave {
  mediaId: string
  episodeId?: string | null
  episodeLabel?: string | null
  episodeNumber?: number | null
  progress?: number
  positionSeconds?: number | null
  durationSeconds?: number | null
}

export interface HistoryRecord extends WatchRecord {
  episodeId: string | null
  episodeLabel: string | null
  episodeNumber: number | null
  positionSeconds: number | null
  durationSeconds: number | null
  updatedAt: string
}

export interface HistoryPage {
  items: HistoryRecord[]
  total: number
  page: number
  pageSize: number
  partial: boolean
}

export interface WatchlistResult {
  items: FavoriteItem[]
  collections: Collection[]
  total: number
  page: number
  pageSize: number
  partial: boolean
}

/** 现有资料编辑、头像上传和登录仍使用 /auth 与 /users/me。 */
export type ProfileInfo = UserProfile & {
  avatar: string | null
  tint: PosterTint
}
