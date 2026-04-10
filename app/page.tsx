'use client'
import { Chip } from '@heroui/react'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from '@headlessui/react'
import {
  Bars3Icon,
  XMarkIcon,
  CircleStackIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@heroui/react'
import type { Dataset, ChartConfig, GeneratedCard } from '@/lib/types'
import FileDropZone from '@/components/FileDropZone'
import ConfigEditor from '@/components/ConfigEditor'
import Preview from '@/components/Preview'

const tabs = [
  { id: 'data', label: 'Data', icon: CircleStackIcon },
  { id: 'config', label: 'Config', icon: Cog6ToothIcon },
] as const

export default function StudioPage() {
  const [config, setConfig] = useState<ChartConfig | null>(null)
  const [configOverride, setConfigOverride] = useState<Partial<ChartConfig>>({})

  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [sheetPattern, setSheetPattern] = useState('{group} - {fileKey}')
  const [inspecting, setInspecting] = useState(false)
  const [inspectError, setInspectError] = useState<string | null>(null)
  const [inspectSummary, setInspectSummary] = useState<string | null>(null)

  const [datasetsJson, setDatasetsJson] = useState('[]')
  const [datasetsError, setDatasetsError] = useState<string | null>(null)

  const [cards, setCards] = useState<GeneratedCard[]>([])
  const [loading, setLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [tab, setTab] = useState<'data' | 'config'>('data')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [landingDragging, setLandingDragging] = useState(false)
  const downloadRef = useRef<HTMLAnchorElement>(null)
  const landingInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(console.error)
  }, [])

  const parsedDatasets: Dataset[] | null = (() => {
    try {
      const ds = JSON.parse(datasetsJson)
      if (datasetsError) setDatasetsError(null)
      return Array.isArray(ds) ? ds : null
    } catch (e) {
      if (!datasetsError) setDatasetsError((e as Error).message)
      return null
    }
  })()

  const mergedConfig = config ? { ...config, ...configOverride } : null

  const handleConfigChange = useCallback((patch: Partial<ChartConfig>) => {
    setConfigOverride((prev) => ({ ...prev, ...patch }))
  }, [])

  async function handleFileUpload(file: File) {
    setUploadedFile(file)
    setInspectError(null)
    setInspectSummary(null)
    setInspecting(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('sheetPattern', sheetPattern)
      const res = await fetch('/api/inspect', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || res.statusText)
      const { dataset, groups, fileKeys, colCounts } = json
      setDatasetsJson(JSON.stringify([dataset], null, 2))
      const colSummary = groups
        .map((g: string) => `${g} (${colCounts[g]})`)
        .join(', ')
      setInspectSummary(
        `${groups.length} groups × ${fileKeys.length} metrics — ${colSummary}`,
      )
    } catch (e) {
      setInspectError((e as Error).message)
    } finally {
      setInspecting(false)
    }
  }

  async function reInspect() {
    if (uploadedFile) await handleFileUpload(uploadedFile)
  }

  async function buildFormData() {
    const datasets = JSON.parse(datasetsJson) as Dataset[]
    if (!uploadedFile) throw new Error('No file uploaded')
    const form = new FormData()
    form.append('datasets', JSON.stringify(datasets))
    form.append('config', JSON.stringify(configOverride))
    for (const ds of datasets) form.append(`files.${ds.id}`, uploadedFile)
    return form
  }

  async function handleGenerate() {
    setLoading(true)
    setGenError(null)
    try {
      const form = await buildFormData()
      const res = await fetch('/api/generate', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || res.statusText)
      setCards(json.cards)
    } catch (e) {
      setGenError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    setLoading(true)
    setGenError(null)
    try {
      const form = await buildFormData()
      const res = await fetch('/api/download', { method: 'POST', body: form })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || res.statusText)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (downloadRef.current) {
        downloadRef.current.href = url
        downloadRef.current.download = 'charts.zip'
        downloadRef.current.click()
        setTimeout(() => URL.revokeObjectURL(url), 5000)
      }
    } catch (e) {
      setGenError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveConfig() {
    if (!mergedConfig) return
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configOverride),
    })
  }

  const canGenerate =
    !!uploadedFile && !datasetsError && !!parsedDatasets?.length

  // ── Landing (no file yet) ────────────────────────────────────────────────
  if (!uploadedFile) {
    function onLandingDrop(e: React.DragEvent) {
      e.preventDefault()
      setLandingDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileUpload(file)
    }

    return (
      <div className='h-screen flex flex-col items-center justify-center bg-neutral-900'>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setLandingDragging(true)
          }}
          onDragLeave={() => setLandingDragging(false)}
          onDrop={onLandingDrop}
          onClick={() => landingInputRef.current?.click()}
          className={[
            'w-120 border border-soild border-neutral-700 rounded-2xl px-12 py-16',
            'flex flex-col items-center gap-3 cursor-pointer transition-colors select-none',
            landingDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-neutral-300 hover:border-neutral-400 bg-neutral-800',
          ].join(' ')}
        >
          <input
            ref={landingInputRef}
            type='file'
            accept='.csv,.xlsx'
            className='hidden'
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFileUpload(f)
            }}
          />
          <svg
            className='w-10 h-10 text-neutral-300'
            fill='none'
            stroke='currentColor'
            strokeWidth={1.5}
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5'
            />
          </svg>
          <p className='text-base font-medium text-neutral-400'>
            Drop your document here
          </p>
          <p className='text-sm text-neutral-600'>.xlsx or .csv</p>
        </div>
        {inspecting && (
          <p className='mt-6 text-sm text-neutral-400 animate-pulse'>
            Detecting structure…
          </p>
        )}
        {inspectError && (
          <p className='mt-6 text-sm text-red-500 max-w-sm text-center whitespace-pre-wrap'>
            {inspectError}
          </p>
        )}
      </div>
    )
  }

  // ── Sidebar content (shared between mobile dialog & desktop) ────────────
  function SidebarContent() {
    return (
      <div className='flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-4 pb-4'>
        {/* Logo / app name */}
        <div className='flex h-14 shrink-0 items-center px-2'>
          <span className='text-white font-semibold text-sm tracking-wide'>
            Bartender
          </span>
        </div>

        {/* Tab nav */}
        <nav className='flex flex-col gap-y-1'>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id)
                setSidebarOpen(false)
              }}
              className={[
                'group flex items-center gap-x-3 rounded-md px-2 py-2 text-sm font-medium w-full text-left transition-colors',
                tab === t.id
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white',
              ].join(' ')}
            >
              <t.icon className='size-5 shrink-0' aria-hidden='true' />
              {t.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className='flex-1 overflow-y-auto space-y-4 text-sm'>
          {tab === 'data' ? (
            <>
              <FileDropZone
                datasetId='file'
                datasetLabel='Document'
                onFile={(_, f) => handleFileUpload(f)}
                current={uploadedFile}
              />

              <div>
                <label className='flex items-center justify-between text-xs font-medium text-gray-400 mb-1'>
                  Sheet pattern
                  <button
                    onClick={reInspect}
                    disabled={inspecting}
                    className='text-indigo-400 hover:text-indigo-300 hover:underline disabled:opacity-40 font-normal'
                  >
                    Re-detect
                  </button>
                </label>
                <input
                  type='text'
                  value={sheetPattern}
                  onChange={(e) => setSheetPattern(e.target.value)}
                  className='w-full bg-white/10 border border-white/20 text-gray-100 rounded px-2 py-1 font-mono text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
                  placeholder='{group} - {fileKey}'
                />
              </div>

              {inspecting && (
                <p className='text-xs text-gray-400 animate-pulse'>
                  Detecting structure…
                </p>
              )}
              {inspectError && (
                <p className='text-xs text-red-400 whitespace-pre-wrap'>
                  {inspectError}
                </p>
              )}
              {inspectSummary && (
                <p className='text-xs text-green-400'>{inspectSummary}</p>
              )}

              <div>
                <label className='block text-xs font-medium text-gray-400 mb-1'>
                  Datasets config{' '}
                  <span className='font-normal text-gray-500'>
                    (auto-populated, editable)
                  </span>
                </label>
                <textarea
                  value={datasetsJson}
                  onChange={(e) => setDatasetsJson(e.target.value)}
                  rows={16}
                  className={[
                    'w-full bg-white/10 border rounded px-2 py-1.5 font-mono text-xs text-gray-100 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500',
                    datasetsError ? 'border-red-500' : 'border-white/20',
                  ].join(' ')}
                  spellCheck={false}
                />
                {datasetsError && (
                  <p className='text-red-400 text-xs mt-1'>{datasetsError}</p>
                )}
              </div>
            </>
          ) : (
            mergedConfig && (
              <ConfigEditor
                config={mergedConfig}
                onChange={handleConfigChange}
              />
            )
          )}
        </div>
      </div>
    )
  }

  // ── Studio (file loaded) ─────────────────────────────────────────────────
  return (
    <div className='h-screen flex overflow-hidden bg-neutral-100'>
      {/* Mobile sidebar (Dialog) */}
      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className='relative z-50 lg:hidden'
      >
        <DialogBackdrop
          transition
          className='fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0'
        />
        <div className='fixed inset-0 flex'>
          <DialogPanel
            transition
            className='relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full'
          >
            <TransitionChild>
              <div className='absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0'>
                <button
                  type='button'
                  onClick={() => setSidebarOpen(false)}
                  className='-m-2.5 p-2.5'
                >
                  <span className='sr-only'>Close sidebar</span>
                  <XMarkIcon className='size-6 text-white' aria-hidden='true' />
                </button>
              </div>
            </TransitionChild>
            <SidebarContent />
          </DialogPanel>
        </div>
      </Dialog>

      {/* Desktop static sidebar */}
      <div className='hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col'>
        <SidebarContent />
      </div>

      {/* Main column */}
      <div className='flex flex-col flex-1 lg:pl-72 min-w-0'>
        {/* Top bar */}
        <div className='sticky top-0 z-40 flex items-center gap-x-4 bg-white border-b border-neutral-200 px-4 py-3 sm:px-6 lg:px-8 shrink-0'>
          {/* Mobile menu button */}
          <button
            type='button'
            onClick={() => setSidebarOpen(true)}
            className='-m-2.5 p-2.5 text-gray-700 lg:hidden'
          >
            <span className='sr-only'>Open sidebar</span>
            <Bars3Icon className='size-5' aria-hidden='true' />
          </button>

          <div className='flex-1' />

          <Button
            variant='outline'
            size='sm'
            isDisabled={!mergedConfig}
            onPress={handleSaveConfig}
          >
            Save config
          </Button>
          <Button
            variant='secondary'
            size='sm'
            isDisabled={!canGenerate || loading}
            onPress={handleGenerate}
          >
            {loading ? 'Working…' : 'Generate'}
          </Button>
          <Button
            variant='primary'
            size='sm'
            isDisabled={!canGenerate || loading}
            onPress={handleDownload}
          >
            Download zip
          </Button>

          <a ref={downloadRef} className='hidden' aria-hidden='true' />
        </div>

        {/* Preview */}
        <main className='flex-1 overflow-y-auto p-6'>
          <Preview cards={cards} loading={loading} error={genError} />
        </main>
      </div>
    </div>
  )
}
