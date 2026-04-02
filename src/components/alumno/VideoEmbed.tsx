'use client'

import { PlayCircle, ExternalLink } from 'lucide-react'

interface VideoEmbedProps {
  url: string
  titulo: string
  duracion?: string
  lang: string
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null
  // youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([^?&#]+)/)
  if (shortMatch) return shortMatch[1]

  // youtube.com/watch?v=ID  o  youtube.com/embed/ID
  const watchMatch = url.match(/[?&]v=([^?&#]+)/)
  if (watchMatch) return watchMatch[1]

  const embedMatch = url.match(/embed\/([^?&#]+)/)
  if (embedMatch) return embedMatch[1]

  return null
}

export default function VideoEmbed({ url, titulo, duracion, lang }: VideoEmbedProps) {
  // Intentar extraer el ID de YouTube primero
  const videoId = extractYouTubeId(url)
  const isSearchUrl = url.includes('results?search_query')

  // Link externo: búsqueda, URL sin ID de YouTube, o no embebible
  if (isSearchUrl || !videoId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
        style={{ background: '#1E2330', color: '#94A3B8' }}
      >
        <PlayCircle className="w-5 h-5 shrink-0" style={{ color: '#6366F1' }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" style={{ color: '#E2E8F0' }}>{titulo}</p>
          <p className="text-xs mt-0.5">{lang === 'en' ? 'External video' : 'Video externo'}</p>
        </div>
        {duracion && <span className="text-xs shrink-0">{duracion}</span>}
        <ExternalLink className="w-4 h-4 shrink-0" />
      </a>
    )
  }

  // Embed iframe con youtube-nocookie
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#1E2330' }}>
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={embedUrl}
          title={titulo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </div>
      {(titulo || duracion) && (
        <div className="px-4 py-3">
          {titulo && <p className="text-sm font-medium" style={{ color: '#E2E8F0' }}>{titulo}</p>}
          {duracion && (
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{duracion}</p>
          )}
        </div>
      )}
    </div>
  )
}
