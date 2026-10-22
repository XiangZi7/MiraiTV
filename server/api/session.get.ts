import { backendRequest, clearAuthSession, SESSION_COOKIE } from '../utils/backend'

export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')
  if (!getCookie(event, SESSION_COOKIE)) return { code: 200, message: 'success', data: null }
  const response = await backendRequest(event, 'users/me')
  if (response.status === 401) {
    clearAuthSession(event)
    return { code: 200, message: 'success', data: null }
  }
  setResponseStatus(event, response.status)
  return response._data
})
