/** 服务端计算北京时间的星期，并通过 Nuxt payload 保持水合一致。 */
export function useShanghaiWeekday() {
  const currentDay = () => {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      weekday: 'short',
    }).format(new Date())
    return (
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday) + 1
    )
  }
  const day = useState('shanghai-weekday', currentDay)
  if (import.meta.client) {
    const refresh = () => {
      day.value = currentDay()
    }
    onMounted(refresh)
    onActivated(refresh)
    useIntervalFn(refresh, 60_000)
  }
  return day
}
