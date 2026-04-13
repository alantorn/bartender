'use client'

import { useState, useRef, useMemo } from 'react'
import { ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export interface ConfigPanelProps {
  datasetsJson: string
  onDatasetsJsonChange: (v: string) => void
  datasetsError: string | null
}

export default function ConfigPanel({
  datasetsJson,
  onDatasetsJsonChange,
  datasetsError,
}: ConfigPanelProps) {
  const [open, setOpen] = useState(false)
  const [findText, setFindText] = useState('')
  const [matchIdx, setMatchIdx] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const matches = useMemo(() => {
    if (!findText) return []
    const positions: number[] = []
    const lower = datasetsJson.toLowerCase()
    const needle = findText.toLowerCase()
    let pos = 0
    while (true) {
      const idx = lower.indexOf(needle, pos)
      if (idx === -1) break
      positions.push(idx)
      pos = idx + 1
    }
    return positions
  }, [datasetsJson, findText])

  function goTo(delta: number) {
    if (!matches.length) return
    const i = ((matchIdx + delta) % matches.length + matches.length) % matches.length
    setMatchIdx(i)
    const el = textareaRef.current
    if (!el) return
    const start = matches[i]
    const end = start + findText.length
    el.focus()
    el.setSelectionRange(start, end)
    const linesBefore = datasetsJson.substring(0, start).split('\n').length
    el.scrollTop = Math.max(0, (linesBefore - 3)) * 16
  }

  return (
    <div
      className='shrink-0 bg-neutral-900 border-t border-neutral-700 flex flex-col overflow-hidden transition-all duration-200 ease-in-out'
      style={{ height: open ? '20rem' : '2.5rem' }}
    >
      {/* Toggle bar — always visible */}
      <div className='h-10 flex shrink-0 items-center px-4 gap-3 border-b border-neutral-700'>
        <button
          onClick={() => setOpen((v) => !v)}
          className='flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors'
        >
          {open ? (
            <ChevronDownIcon className='w-4 h-4' aria-hidden='true' />
          ) : (
            <ChevronUpIcon className='w-4 h-4' aria-hidden='true' />
          )}
          JSON config editor
        </button>

        <div className='flex-1' />

        {/* Find bar */}
        {open && (
          <div className='flex items-center gap-1'>
            <MagnifyingGlassIcon className='w-3.5 h-3.5 text-gray-500 shrink-0' />
            <input
              type='search'
              placeholder='Find…'
              value={findText}
              onChange={e => { setFindText(e.target.value); setMatchIdx(0) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); goTo(e.shiftKey ? -1 : 1) } }}
              className='bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36'
            />
            {findText && (
              <>
                <span className='text-xs text-gray-500 shrink-0'>
                  {matches.length ? `${matchIdx + 1}/${matches.length}` : '0'}
                </span>
                <button onClick={() => goTo(-1)} disabled={!matches.length} className='text-gray-400 hover:text-white disabled:opacity-30 px-0.5'>‹</button>
                <button onClick={() => goTo(1)}  disabled={!matches.length} className='text-gray-400 hover:text-white disabled:opacity-30 px-0.5'>›</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Scrollable config content */}

      {/* Datasets JSON */}
      <div className='flex flex-col flex-1 min-h-0'>
        <textarea
          ref={textareaRef}
          value={datasetsJson}
          onChange={(e) => onDatasetsJsonChange(e.target.value)}
          className={[
            'flex-1 min-h-48 w-full bg-white/10 border rounded px-2 py-1.5 font-mono text-xs text-gray-100 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500',
            datasetsError ? 'border-red-500' : 'border-white/20',
          ].join(' ')}
          spellCheck={false}
        />
        {datasetsError && (
          <p className='text-red-400 text-xs mt-1'>{datasetsError}</p>
        )}
      </div>
    </div>
  )
}
