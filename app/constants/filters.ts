/** 下拉筛选项 */
export interface FilterOption {
  label: string
  value: string
}

const toOptions = (labels: string[]): FilterOption[] =>
  labels.map((label, index) => ({ label, value: index === 0 ? 'all' : label }))

/** 年代 */
export const YEAR_OPTIONS = [
  { label: '全部年份', value: 'all' },
  ...Array.from({ length: 127 }, (_, i) => ({
    label: String(2026 - i),
    value: String(2026 - i),
  })),
]

/** 地区 */
export const REGION_OPTIONS = toOptions([
  '全部地区',
  '中国大陆',
  '中国香港',
  '美国',
  '日本',
  '韩国',
  '英国',
  '法国',
])

/** 评分 */
export const RATING_OPTIONS = [
  { label: '全部评分', value: 'all' },
  ...[9, 8, 7, 6].map(value => ({
    label: `${value} 分以上`,
    value: String(value),
  })),
]

/** 电影题材 */
export const MOVIE_GENRES = [
  '全部',
  '剧情',
  '科幻',
  '悬疑',
  '动画',
  '爱情',
  '动作',
  '冒险',
  '恐怖',
  '纪录片',
  '喜剧',
]

/** 剧集题材 */
export const SERIES_GENRES = [
  '全部',
  '热血',
  '悬疑',
  '都市',
  '言情',
  '家庭',
  '古装',
  '科幻',
  '犯罪',
  '历史',
]

/** 动漫题材 */
export const ANIME_GENRES = [
  '全部',
  '热血',
  '治愈',
  '科幻',
  '奇幻',
  '恋爱',
  '异世界',
  '日常',
  '悬疑',
  '运动',
]

/** 片单页签 */
export const WATCHLIST_TABS = ['收藏', '电影', '剧集', '动漫']

/** 作品详情页签 */
export const DETAIL_TABS = ['详情', '剧照', '演员', '相关推荐']
