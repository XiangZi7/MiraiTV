export interface Announcement {
  id: number
  title: string
  content: string
  linkUrl: string | null
  linkLabel: string
  updatedAt: string
}

export interface PromotedApp {
  id: number
  name: string
  tagline: string
  description: string | null
  iconUrl: string | null
  targetUrl: string
  buttonLabel: string
  platforms: string[]
  badge: string | null
}

export interface SiteContent {
  announcementsEnabled: boolean
  promotionsEnabled: boolean
  announcements: Announcement[]
  apps: PromotedApp[]
}
