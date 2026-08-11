import type { Project } from '../types'
import { getCoverKind, normalizeSiteUrl, siteHostname } from '../types'

function mediaSrc(url: string) {
  if (!url) return ''
  return url
}

function MediaFill({ project }: { project: Project }) {
  if (!project.mediaUrl) return null
  if (project.mediaType === 'video') {
    return (
      <video
        src={mediaSrc(project.mediaUrl)}
        muted
        playsInline
        preload="metadata"
        className="cover-media"
      />
    )
  }
  return <img className="cover-media" src={mediaSrc(project.mediaUrl)} alt={project.title} />
}

const THEMES: Record<
  string,
  { bar: string; mark: string; showPlay?: boolean; empty: string }
> = {
  site: { bar: '', mark: 'WWW', empty: 'website' },
  reels: { bar: 'instagram.com/reels', mark: 'REELS', showPlay: true, empty: 'Reels' },
  wb: { bar: 'wildberries.ru/card', mark: 'WB', empty: 'Карточка WB' },
  clip: { bar: 'music / clip', mark: 'CLIP', showPlay: true, empty: 'Клип' },
  ad: { bar: 'promo · 30s', mark: 'AD', showPlay: true, empty: 'Реклама' },
  media: { bar: 'preview', mark: 'PLAY', showPlay: true, empty: 'Превью' },
}

export function ThemedCover({ project }: { project: Project }) {
  const kind = getCoverKind(project.category, project.mediaType)
  const href = project.link ? normalizeSiteUrl(project.link) : ''
  const host = href ? siteHostname(href) : ''
  const theme = THEMES[kind] || THEMES.media
  const barText = kind === 'site' ? host || 'website' : theme.bar
  const titleFallback = kind === 'site' ? host || project.title : theme.empty

  return (
    <div className={`cover cover--${kind}`} aria-hidden>
      <div className="mock">
        <div className="mock__bar">
          <span />
          <span />
          <span />
          <div className="mock__url">{barText}</div>
        </div>
        <div className="mock__screen">
          {project.mediaUrl ? (
            <MediaFill project={project} />
          ) : (
            <strong className="mock__fallback">{titleFallback}</strong>
          )}
          <em className="mock__mark">{theme.mark}</em>
          {theme.showPlay && project.mediaUrl ? (
            <span className="mock__play">▶</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
