'use client'

import type { GeneratedCard } from '@/lib/types'

interface Props {
  cards:   GeneratedCard[]
  loading: boolean
  error?:  string | null
}

function downloadCard(card: GeneratedCard) {
  const blob = new Blob([card.svgData], { type: 'image/svg+xml' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${card.id}.svg`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export default function Preview({ cards, loading, error }: Props) {
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
        <strong>Error:</strong> {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-sm text-neutral-400 animate-pulse py-8 text-center">
        Generating charts…
      </div>
    )
  }

  if (!cards.length) {
    return (
      <div className="text-sm text-neutral-400 py-8 text-center">
        Upload a file and click <strong>Generate</strong> to preview charts here.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-6">
      {cards.map(card => (
        <div key={card.id} id={`card-${card.id}`} className="border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
          <div
            dangerouslySetInnerHTML={{ __html: card.svgData }}
          />
          <div className="px-3 py-1.5 bg-neutral-50 border-t border-neutral-200 flex items-center gap-2">
            <span className="flex-1 text-xs text-neutral-400 font-mono truncate">{card.id}.svg</span>
            <button
              onClick={() => downloadCard(card)}
              title="Download SVG"
              className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors px-1.5 py-0.5 rounded hover:bg-neutral-200"
            >
              ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
