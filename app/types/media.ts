/**
 * 影视内容领域模型
 * 当前阶段仅用于驱动 UI，字段命名已对齐后续接口契约
 */

/** 内容类型 */
export type MediaKind = 'movie' | 'series' | 'anime' | 'variety' | 'documentary'

/** 更新状态 */
export type MediaStatus = 'airing' | 'finished' | 'upcoming'

/** 星期，1 = 周一，7 = 周日 */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

/**
 * 海报占位渐变
 * 接口接入前用于生成有辨识度的封面，接入后由 poster 字段覆盖
 */
export interface PosterTint {
  /** 渐变起始色 */
  from: string
  /** 渐变结束色 */
  to: string
}

/** 影视条目 */
export interface MediaItem {
  id: string
  /** 原生搜索结果所属的视频源 */
  sourceKey?: string | null
  sourceName?: string | null
  /** 中文标题 */
  title: string
  /** 原始标题（日文 / 英文） */
  originalTitle?: string | null
  /** 海报图地址，缺省时回退到 tint 渐变 */
  poster?: string | null
  /** 横版剧照地址 */
  backdrop?: string | null
  /** 海报占位渐变 */
  tint: PosterTint
  /** 上映年份 */
  year: number | null
  /** 制作地区 */
  region?: string | null
  kind: MediaKind | null
  /** 题材标签 */
  genres: string[]
  /** 评分，10 分制 */
  rating: number | null
  /** 评分人数 */
  ratingCount?: number | null
  /** 总集数，电影为空 */
  episodes?: number | null
  /** 单集 / 影片时长，如 1h 30m */
  duration?: string | null
  /** 榜单排名 */
  rank?: number | null
  /** 剧情简介 */
  synopsis?: string | null
  /** 装饰性短句，用于 Hero 右侧竖排文案 */
  tagline?: string[]
  /** 元数据别名，供后端匹配播放资源 */
  aliases?: string[]
}

/** 番剧排期条目 */
export interface ScheduleItem {
  id: string
  media: MediaItem
  /** 播出星期 */
  weekday: Weekday
  /** 播出时刻，如 00:30 */
  airTime: string | null
  /** 最新集数 */
  latestEpisode: number | null
  status: MediaStatus | null
}

/** 观看进度 */
export interface WatchRecord {
  id: string
  media: MediaItem
  /** 当前集标签，如 第 4 集 */
  episodeLabel?: string | null
  /** 观看百分比 0-100 */
  progress: number
  /** 观看日期 YYYY-MM-DD */
  watchedAt: string
  /** 续播时使用真实源站分集 ID */
  episodeId?: string | null
  positionSeconds?: number | null
  durationSeconds?: number | null
}

/** 片单集合 */
export interface Collection {
  id: string
  name: string
  /** 收录数量 */
  count: number
  tint: PosterTint
  /** 片单内前若干部作品，用于拼贴封面 */
  items?: MediaItem[]
}

/** 分集 */
export interface Episode {
  id: string
  /** 集序号 */
  index: number
  title: string
  duration: string | null
  durationSeconds?: number | null
  airDate?: string | null
  /** 剧照 */
  tint: PosterTint
}

/** 演职人员 */
export interface CastMember {
  id: string
  name: string
  /** 饰演角色 / 职位 */
  role: string
  tint: PosterTint
}

/** 用户资料 */
export interface UserProfile {
  id: string
  name: string
  /** 个性签名 */
  bio: string
  /** 会员标识 */
  badge?: string | null
  avatar?: string | null
  background?: string | null
  tint: PosterTint
  stats: {
    /** 看过 */
    watched: number
    /** 片单 */
    collections: number
    /** 关注 */
    following: number | null
    /** 粉丝 */
    followers: number | null
  }
}
