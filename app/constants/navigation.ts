/** 顶部主导航 */
export interface NavLink {
  label: string
  to: string
  /** 移动端底部导航图标 */
  icon?: string
}

export const MAIN_NAV: NavLink[] = [
  { label: '发现', to: '/', icon: 'lucide:compass' },
  { label: '电影', to: '/movies', icon: 'lucide:film' },
  { label: '剧集', to: '/series', icon: 'lucide:tv' },
  { label: '动漫', to: '/anime', icon: 'lucide:sparkles' },
  { label: '片单', to: '/watchlist', icon: 'lucide:bookmark' },
]

/** 个人中心页签 */
export const PROFILE_TABS: NavLink[] = [
  { label: '我的片单', to: '/profile' },
  { label: '观看历史', to: '/history' },
  { label: '关注', to: '/profile?tab=following' },
  { label: '设置', to: '/settings' },
]

/** 星期映射，索引 0 占位，1 = 周一 */
export const WEEKDAY_LABELS = [
  '',
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '日',
] as const

/** 星期全称 */
export const WEEKDAY_FULL = [
  '',
  '周一',
  '周二',
  '周三',
  '周四',
  '周五',
  '周六',
  '周日',
] as const
