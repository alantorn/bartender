'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

export interface ConfigPanelProps {
  datasetsJson:         string
  onDatasetsJsonChange: (v: string) => void
  datasetsError:        string | null
}

export default function ConfigPanel({
  datasetsJson,
  onDatasetsJsonChange,
  datasetsError,
}: ConfigPanelProps) {
  const [open, setOpen] = useState(false)

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
          JSON config
        </button>

        <div className='flex-1' />


      </div>

      {/* Scrollable config content */}

      {/* Datasets JSON */}
      <div className='flex flex-col flex-1 min-h-0'>
        <label className='block text-xs font-medium text-gray-400 mb-1'>
          Datasets config{' '}
          <span className='font-normal text-gray-500'>
            (auto-populated, editable)
          </span>
        </label>
        <textarea
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
