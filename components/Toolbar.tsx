'use client'

import { Bars3Icon } from '@heroicons/react/24/outline'

export interface ToolbarProps {
  onMenuOpen:  () => void
  loading:     boolean
  canGenerate: boolean
  onGenerate:  () => void
  onDownload:  () => void
}

export default function Toolbar({
  onMenuOpen,
  loading,
  canGenerate,
  onGenerate,
  onDownload,
}: ToolbarProps) {
  return (
    <div className="sticky top-0 z-40 flex shrink-0 items-center gap-x-4 bg-white border-b border-neutral-200 px-4 py-3 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={onMenuOpen}
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="size-5" aria-hidden="true" />
      </button>

      <div className="flex-1" />

      {/* Actions */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate || loading}
        className="rounded px-3 py-1.5 text-sm font-medium bg-neutral-100 text-neutral-700 border border-neutral-300 hover:bg-neutral-200 disabled:opacity-40 transition-colors"
      >
        {loading ? 'Working…' : 'Generate'}
      </button>

      <button
        type="button"
        onClick={onDownload}
        disabled={!canGenerate || loading}
        className="rounded px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
      >
        Download zip
      </button>
    </div>
  )
}
