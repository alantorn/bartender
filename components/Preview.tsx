'use client'

import type { GeneratedCard } from '@/lib/types'

interface Props {
  cards:   GeneratedCard[]
  loading: boolean
  error?:  string | null
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
    <div className="flex flex-wrap gap-6">
      {cards.map(card => (
        <div key={card.id} className="border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
          <div
            // Render the SVG inline so fonts/colors are live
            // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG is generated server-side from trusted spec
            dangerouslySetInnerHTML={{ __html: card.svgData }}
          />
          <div className="px-3 py-1.5 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-400 font-mono truncate">
            {card.id}.svg
          </div>
        </div>
      ))}
    </div>
  )
}
