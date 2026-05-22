'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dataset, ChartConfig, GeneratedCard } from '@/lib/types'

/**
 * All studio state and async handlers in one place.
 * page.tsx (or any future orchestrator) just calls this hook and passes
 * the returned props to the layout components.
 */
export function useStudio() {
  // ── Config ──────────────────────────────────────────────────────────────
  const [config, setConfig] = useState<ChartConfig | null>(null)
  const [configOverride, setConfigOverride] = useState<Partial<ChartConfig>>({})

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(setConfig)
      .catch(console.error)
  }, [])

  const mergedConfig = config ? { ...config, ...configOverride } : null

  const handleConfigChange = useCallback((patch: Partial<ChartConfig>) => {
    setConfigOverride(prev => ({ ...prev, ...patch }))
  }, [])

  async function handleSaveConfig() {
    if (!mergedConfig) return
    await fetch('/api/config', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(configOverride),
    })
  }

  // ── File / inspect ──────────────────────────────────────────────────────
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [inspecting,   setInspecting]   = useState(false)
  const [inspectError, setInspectError] = useState<string | null>(null)
  const [inspectSummary, setInspectSummary] = useState<string | null>(null)

  async function handleFileUpload(file: File) {
    setUploadedFile(file)
    setInspectError(null)
    setInspectSummary(null)
    setInspecting(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch('/api/inspect', { method: 'POST', body: form })
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

  const reInspect = () => { if (uploadedFile) handleFileUpload(uploadedFile) }

  // ── Datasets JSON ────────────────────────────────────────────────────────
  const [datasetsJson,   setDatasetsJson]   = useState('[]')
  const [datasetsError,  setDatasetsError]  = useState<string | null>(null)

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

  // ── Generate / download ──────────────────────────────────────────────────
  const [cards,    setCards]    = useState<GeneratedCard[]>([])
  const [loading,  setLoading]  = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const downloadRef = useRef<HTMLAnchorElement>(null)

  async function buildFormData() {
    const datasets = JSON.parse(datasetsJson) as Dataset[]
    if (!uploadedFile) throw new Error('No file uploaded')
    const form = new FormData()
    form.append('datasets', JSON.stringify(datasets))
    form.append('config',   JSON.stringify(mergedConfig ?? configOverride))
    for (const ds of datasets) form.append(`files.${ds.id}`, uploadedFile)
    return form
  }

  async function handleGenerate() {
    setLoading(true)
    setGenError(null)
    try {
      const form = await buildFormData()
      const res  = await fetch('/api/generate', { method: 'POST', body: form })
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
      const res  = await fetch('/api/download', { method: 'POST', body: form })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || res.statusText)
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      if (downloadRef.current) {
        downloadRef.current.href     = url
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

  const canGenerate = !!uploadedFile && !datasetsError && !!parsedDatasets?.length

  // ── Sidebar / UI state ───────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ── Composed prop bags ───────────────────────────────────────────────────
  /** Props for DataSidebar (or any replacement sidebar). */
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
    cardIds:               cards.map(c => c.id),
    cards,
  }

  /** Props for the Toolbar. */
  const toolbarProps = {
    onMenuOpen:  () => setSidebarOpen(true),
    loading,
    canGenerate,
    onGenerate:  handleGenerate,
    onDownload:  handleDownload,
  }

  /** Props for Preview. */
  const previewProps = {
    cards,
    loading,
    error:                 genError,
    datasetsJson,
    onDatasetsJsonChange:  setDatasetsJson,
    onDownload:            handleDownload,
  }

  /** Props for ConfigPanel. */
  const configPanelProps = {
    datasetsJson,
    onDatasetsJsonChange:  setDatasetsJson,
    datasetsError,
  }

  return {
    // Raw state (for layout decisions)
    uploadedFile,
    sidebarOpen,
    setSidebarOpen,
    downloadRef,
    // Composed prop bags
    sidebarProps,
    toolbarProps,
    previewProps,
    configPanelProps,
  }
}
