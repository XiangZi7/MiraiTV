/** 账号接口保留 FastAPI 的 snake_case。 */
export interface AccountUser {
  id: number
  username: string
  email: string | null
  phone: string | null
  bio: string | null
  avatar_url: string | null
  background_url?: string | null
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface LoginData {
  access_token: string
  token_type: string
  expires_in: number
  user: AccountUser
}

export interface RegisterInput {
  username: string
  email: string
  password: string
  email_code: string
}

export interface ProfileUpdate {
  username?: string
  email?: string | null
  phone?: string | null
  bio?: string | null
}
