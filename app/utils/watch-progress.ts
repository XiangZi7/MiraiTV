import type { WatchRecord } from '~/types/media'

type ProgressRecord = Pick<
  WatchRecord,
  'progress' | 'positionSeconds' | 'durationSeconds'
>

function clock(seconds: number) {
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = String(total % 60).padStart(2, '0')
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}`
    : `${minutes}:${rest}`
}

/** Prefer the saved playback position; older records may only contain a percentage. */
export function watchProgress(record: ProgressRecord) {
  const duration =
    typeof record.durationSeconds === 'number' &&
    Number.isFinite(record.durationSeconds) &&
    record.durationSeconds > 0
      ? record.durationSeconds
      : null
  const position =
    typeof record.positionSeconds === 'number' &&
    Number.isFinite(record.positionSeconds) &&
    record.positionSeconds >= 0
      ? Math.min(record.positionSeconds, duration ?? Infinity)
      : null
  const progress = Math.max(
    0,
    Math.min(
      100,
      position !== null && duration !== null
        ? (position / duration) * 100
        : Number.isFinite(record.progress)
          ? record.progress
          : 0
    )
  )
  const label =
    position !== null
      ? `观看至 ${clock(position)}${duration !== null ? ` / ${clock(duration)}` : ''}`
      : progress <= 0
        ? '尚未开始'
        : progress < 1
          ? '刚刚开始'
          : progress >= 100
            ? '已看完'
            : `已观看 ${Math.min(99, Math.round(progress))}%`
  return { progress, label }
}
