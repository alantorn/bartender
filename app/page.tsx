'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { Dataset, ChartConfig, GeneratedCard } from '@/lib/types'
import LandingZone  from '@/components/LandingZone'
import DataSidebar  from '@/components/DataSidebar'
import ConfigPanel  from '@/components/ConfigPanel'
import Toolbar      from '@/components/Toolbar'
import Preview      from '@/components/Preview'

export default function StudioPage() {
  const [config, setConfig] = useState<ChartConfig | null>(null)
  const [configOverride, setConfigOverride] = useState<Partial<ChartConfig>>({})

  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [inspecting, setInspecting] = useState(false)
  const [inspectError, setInspectError] = useState<string | null>(null)
  const [inspectSummary, setInspectSummary] = useState<string | null>(null)

  const [datasetsJson, setDatasetsJson] = useState('[]')
  const [datasetsError, setDatasetsError] = useState<string | null>(null)

  const [cards, setCards] = useState<GeneratedCard[]>([])
  const [loading, setLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const downloadRef = useRef<HTMLAnchorElement>(null)

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
      const res = await fetch('/api/inspect', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || res.statusText)
      const { dataset, sheetNames } = json
      setDatasetsJson(JSON.stringify([dataset], null, 2))
      setInspectSummary(`${sheetNames.length} sheets detected`)
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
    return (
      <LandingZone
        onFile={handleFileUpload}
        inspecting={inspecting}
        error={inspectError}
      />
    )
  }

  // ── Studio (file loaded) ─────────────────────────────────────────────────
  const sidebarProps = {
    file:                  uploadedFile,
    onFile:                handleFileUpload,
    onReInspect:           reInspect,
    inspecting,
    inspectError,
    inspectSummary,
    datasetsJson,
    onDatasetsJsonChange:  setDatasetsJson,
    config:                mergedConfig,
    onChange:              handleConfigChange,
    onSave:                handleSaveConfig,
  }

  return (
    <div className='h-screen flex flex-col overflow-hidden bg-neutral-100'>

      {/* Mobile sidebar drawer */}
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
            <DataSidebar {...sidebarProps} />
          </DialogPanel>
        </div>
      </Dialog>

      {/* Desktop static sidebar */}
      <div className='hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col'>
        <DataSidebar {...sidebarProps} />
      </div>

      {/* Main column: toolbar + preview + config panel */}
      <div className='flex flex-col flex-1 lg:pl-72 min-h-0 min-w-0'>
        <Toolbar
          onMenuOpen={() => setSidebarOpen(true)}
          loading={loading}
          canGenerate={canGenerate}
          onGenerate={handleGenerate}
          onDownload={handleDownload}
        />

        <main className='flex-1 overflow-y-auto p-6 min-h-0'>
          <Preview cards={cards} loading={loading} error={genError} />
        </main>

        <ConfigPanel
          datasetsJson={datasetsJson}
          onDatasetsJsonChange={setDatasetsJson}
          datasetsError={datasetsError}
        />
      </div>

      {/* Hidden anchor for programmatic download */}
      <a ref={downloadRef} className='hidden' aria-hidden='true' />
    </div>
  )
}
