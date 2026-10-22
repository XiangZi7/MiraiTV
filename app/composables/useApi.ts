import type { FetchOptions } from 'ofetch'
import type { AccountUser, ProfileUpdate, RegisterInput } from '~/types/account'
import type { SiteContent } from '~/types/site-content'
import type { ActivityChange, ActivityResult } from '~/types/activity'
import type {
  ApiResponse,
  CatalogQuery,
  FavoriteItem,
  FavoriteSave,
  HistoryPage,
  HistoryRecord,
  HistorySave,
  HomeResult,
  MediaDetail,
  MediaPage,
  MetadataProviderInfo,
  PlaybackResult,
  PlaybackSources,
  ProfileInfo,
  ScheduleResult,
  SearchSuggestions,
  WatchlistResult,
} from '~/types/web-api'

/** 每次 setup 创建客户端；SSR 使用当前请求的 Cookie，不共享认证状态。 */
export function useApi() {
  const fetch = useRequestFetch()
  const session = useState<AccountUser | null>('session-user', () => null)
  async function request<T>(
    path: string,
    options: Pick<FetchOptions, 'body' | 'query' | 'signal'> & {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    } = {}
  ): Promise<T> {
    try {
      const response = await fetch<ApiResponse<T>>(`/api/backend/${path}`, {
        ...options,
        retry: 0,
      })
      if (response.code < 200 || response.code >= 300)
        throw createError({
          statusCode: response.code,
          message: response.message,
        })
      return response.data as T
    } catch (error) {
      if (
        (error as { statusCode?: number; status?: number }).statusCode ===
          401 ||
        (error as { status?: number }).status === 401
      ) {
        session.value = null
        clearNuxtData(key => key.startsWith('private:'))
      }
      throw createError({
        statusCode: (error as { statusCode?: number }).statusCode ?? 500,
        message: apiErrorMessage(error),
      })
    }
  }
  const mediaPath = (id: string) => `web/media/${encodeURIComponent(id)}`
  return {
    syncActivity: (changes: ActivityChange[]) =>
      request<ActivityResult>('web/me/activity/sync', {
        method: 'POST',
        body: { changes },
      }),
    providers: () => request<MetadataProviderInfo[]>('web/providers'),
    home: () => request<HomeResult>('web/home'),
    siteContent: () => request<SiteContent>('web/site-content'),
    catalog: (query: CatalogQuery, signal?: AbortSignal) =>
      request<MediaPage>('web/catalog', { query, signal }),
    search: (keyword: string, query: CatalogQuery = {}, signal?: AbortSignal) =>
      request<MediaPage>('web/search', {
        query: { ...query, keyword },
        signal,
      }),
    suggestions: () => request<SearchSuggestions>('web/search/suggestions'),
    schedule: () => request<ScheduleResult>('web/schedule'),
    detail: (id: string) => request<MediaDetail>(mediaPath(id)),
    sources: (
      id: string,
      signal?: AbortSignal,
      binding?: { source: string; seriesId: string },
      search = false
    ) =>
      request<PlaybackSources>(`${mediaPath(id)}/sources`, {
        signal,
        query: { ...binding, search },
      }),
    play: (
      id: string,
      query: {
        source: string
        seriesId?: string
        episodeId: string
        line?: string
      },
      signal?: AbortSignal
    ) => request<PlaybackResult>(`${mediaPath(id)}/play`, { query, signal }),
    profile: () => request<ProfileInfo>('web/me/profile'),
    watchlist: (page = 1, pageSize = 100) =>
      request<WatchlistResult>('web/me/watchlist', {
        query: { page, pageSize },
      }),
    favorite: (body: FavoriteSave) =>
      request<FavoriteItem>('web/me/favorites', { method: 'PUT', body }),
    favoriteStatus: (id: string) =>
      request<{ collected: boolean; notifyEnabled: boolean }>(
        `web/me/favorites/${encodeURIComponent(id)}`
      ),
    mediaHistory: (id: string) =>
      request<HistoryRecord | null>(
        `web/me/history/media/${encodeURIComponent(id)}`
      ),
    unfavorite: (id: string) =>
      request<null>(`web/me/favorites/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    history: (page = 1, pageSize = 100) =>
      request<HistoryPage>('web/me/history', { query: { page, pageSize } }),
    saveHistory: (body: HistorySave) =>
      request<HistoryRecord>('web/me/history', { method: 'PUT', body }),
    removeHistory: (id: string) =>
      request<null>(`web/me/history/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    clearHistory: () =>
      request<{ deleted: number }>('web/me/history', { method: 'DELETE' }),
    login: (account: string, password: string) =>
      request<{ user: AccountUser }>('auth/login', {
        method: 'POST',
        body: { account, password },
      }),
    logout: () => request<null>('auth/logout', { method: 'POST' }),
    logoutAll: () => request<null>('auth/logout-all', { method: 'POST' }),
    sendCode: (email: string) =>
      request<null>('auth/email/code', { method: 'POST', body: { email } }),
    register: (body: RegisterInput) =>
      request<AccountUser>('auth/register', { method: 'POST', body }),
    sendResetCode: (email: string) =>
      request<null>('auth/password/reset/code', {
        method: 'POST',
        body: { email },
      }),
    resetPassword: (email: string, email_code: string, new_password: string) =>
      request<null>('auth/password/reset', {
        method: 'POST',
        body: { email, email_code, new_password },
      }),
    updateProfile: (body: ProfileUpdate) =>
      request<AccountUser>('users/me', { method: 'PATCH', body }),
    uploadAvatar: (file: File) => {
      const body = new FormData()
      body.append('file', file)
      return request<AccountUser>('users/me/avatar', { method: 'POST', body })
    },
    deleteAvatar: () =>
      request<AccountUser>('users/me/avatar', { method: 'DELETE' }),
    uploadBackground: (file: File) => {
      const body = new FormData()
      body.append('file', file)
      return request<AccountUser>('users/me/background', {
        method: 'POST',
        body,
      })
    },
    deleteBackground: () =>
      request<AccountUser>('users/me/background', { method: 'DELETE' }),
    changePassword: (current_password: string, new_password: string) =>
      request<null>('auth/password', {
        method: 'PUT',
        body: { current_password, new_password },
      }),
  }
}
