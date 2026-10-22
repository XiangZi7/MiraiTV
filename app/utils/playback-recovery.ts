import type { PlaybackMatch, SourceEpisode } from '~/types/web-api'

export interface PlaybackSelection {
  source: string
  seriesId: string
  episodeId: string
  line?: string
}

export function playbackSelectionKey(selection: PlaybackSelection) {
  return `${selection.source}:${selection.seriesId}:${selection.episodeId}:${selection.line ?? ''}`
}

export function matchingSourceEpisode(
  current: SourceEpisode,
  target: PlaybackMatch,
  single: boolean
) {
  const numbered =
    current.index != null
      ? target.episodes.find(item => item.index === current.index)
      : undefined
  if (numbered) return numbered
  const title = current.title.replace(/\s+/g, '').toLowerCase()
  const named = target.episodes.find(
    item => item.title.replace(/\s+/g, '').toLowerCase() === title
  )
  if (named) return named
  // 单片各站可能标注为正片、HD或1080P；预告和特别篇不能充当正片。
  if (
    single &&
    target.episodes.length === 1 &&
    !/预告|花絮|特辑|特别|trailer/i.test(
      current.title + target.episodes[0]!.title
    )
  )
    return target.episodes[0]
}

export function playbackCandidates(
  matches: PlaybackMatch[],
  origin: PlaybackMatch,
  current: SourceEpisode
) {
  const selections: PlaybackSelection[] = []
  for (const match of matches) {
    const episode =
      match === origin
        ? current
        : matchingSourceEpisode(current, match, origin.episodes.length === 1)
    if (!episode) continue
    for (const line of episode.lines.length ? episode.lines : [undefined]) {
      selections.push({
        source: match.source,
        seriesId: match.seriesId,
        episodeId: episode.id,
        line: line?.id,
      })
    }
  }
  return selections
}
