'use client'

import { useRef, useState } from 'react'

interface Props {
  onFile:     (file: File) => void
  inspecting: boolean
  error?:     string | null
}

export default function LandingZone({ onFile, inspecting, error }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-neutral-900">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          'w-120 border border-solid rounded-2xl px-12 py-16',
          'flex flex-col items-center gap-3 cursor-pointer transition-colors select-none',
          dragging
            ? 'border-blue-400 bg-blue-950'
            : 'border-neutral-700 hover:border-neutral-500 bg-neutral-800',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />
        <svg
          className="w-10 h-10 text-neutral-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-base font-medium text-neutral-300">Drop your document here</p>
        <p className="text-sm text-neutral-500">.xlsx or .csv</p>
      </div>

      {inspecting && (
        <p className="mt-6 text-sm text-neutral-400 animate-pulse">Detecting structure…</p>
      )}
      {error && (
        <p className="mt-6 text-sm text-red-400 max-w-sm text-center whitespace-pre-wrap">{error}</p>
      )}
    </div>
  )
}
