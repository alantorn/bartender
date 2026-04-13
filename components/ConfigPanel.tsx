'use client'

import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import {
  search,
  SearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
} from '@codemirror/search'
import { EditorView } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

const matchHighlight = Prec.highest(
  EditorView.theme({
    '.cm-searchMatch': {
      backgroundColor: '#f59e0b66',
      outline: '1px solid #f59e0b',
      borderRadius: '2px',
    },
    '.cm-searchMatch-selected': {
      backgroundColor: '#f59e0b',
      color: '#000',
      outline: '1px solid #d97706',
      borderRadius: '2px',
    },
  }),
)

const PANEL_HEIGHT = 320 // 20rem in px

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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [findText, setFindText] = useState('')
  const editorRef = useRef<ReactCodeMirrorRef>(null)

  const tabRef    = useRef<HTMLDivElement>(null)
  const panelRef  = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const tlRef     = useRef<gsap.core.Timeline | null>(null)

  // Animate open/close
  const animateOpen = useCallback((open: boolean) => {
    tlRef.current?.kill()
    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } })
    tlRef.current = tl
    if (open) {
      tl.to(tabRef.current,    { height: 0, opacity: 0, duration: 0.18 }, 0)
      tl.to(panelRef.current,  { height: PANEL_HEIGHT, duration: 0.35 }, 0.05)
      tl.to(headerRef.current, { opacity: 1, duration: 0.2 }, 0.25)
    } else {
      tl.to(headerRef.current, { opacity: 0, duration: 0.1 }, 0)
      tl.to(panelRef.current,  { height: 0, duration: 0.3 }, 0.08)
      tl.to(tabRef.current,    { height: 36, opacity: 1, duration: 0.2 }, 0.2)
    }
  }, [])

  // Animate fullscreen expand/collapse (assumes already open)
  const animateFullscreen = useCallback((fs: boolean, containerH: number) => {
    tlRef.current?.kill()
    gsap.to(panelRef.current, {
      height: fs ? containerH : PANEL_HEIGHT,
      duration: 0.4,
      ease: 'power3.inOut',
    })
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)

  function open() {
    animateOpen(true)
  }

  function close() {
    setIsFullscreen(false)
    animateOpen(false)
  }

  function toggleFullscreen() {
    const container = containerRef.current?.parentElement
    const h = container?.getBoundingClientRect().height ?? window.innerHeight
    setIsFullscreen(v => {
      animateFullscreen(!v, h)
      return !v
    })
  }

  // Set initial DOM state (no animation on mount)
  useEffect(() => {
    gsap.set(tabRef.current,    { height: 36, opacity: 1 })
    gsap.set(panelRef.current,  { height: 0 })
    gsap.set(headerRef.current, { opacity: 0 })
  }, [])

  const matchCount = useMemo(() => {
    if (!findText) return 0
    const lower = datasetsJson.toLowerCase()
    const needle = findText.toLowerCase()
    let count = 0, pos = 0
    while (true) {
      const idx = lower.indexOf(needle, pos)
      if (idx === -1) break
      count++
      pos = idx + 1
    }
    return count
  }, [datasetsJson, findText])

  function handleFindChange(text: string) {
    setFindText(text)
    const view = editorRef.current?.view
    if (view) {
      view.dispatch({
        effects: setSearchQuery.of(
          new SearchQuery({ search: text, caseSensitive: false }),
        ),
      })
    }
  }

  function nav(direction: 'next' | 'prev') {
    const view = editorRef.current?.view
    if (!view) return
    if (direction === 'next') findNext(view)
    else findPrevious(view)
  }

  return (
    <div ref={containerRef} className={`w-full ${isFullscreen ? 'absolute inset-0 z-10' : 'shrink-0'}`}>
      {/* Tab */}
      <div ref={tabRef} className='flex justify-end overflow-hidden'>
        <button
          onClick={open}
          className='h-9 px-4 flex items-center gap-1.5 bg-zinc-800 rounded-t-xl text-sm text-zinc-400 hover:text-white transition-colors'
        >
          JSON config editor
        </button>
      </div>

      {/* Panel */}
      <div
        ref={panelRef}
        className={`overflow-hidden bg-zinc-900 ${isFullscreen ? 'absolute inset-0' : 'border-t border-zinc-700'}`}
        style={{ height: 0 }}
      >
        <div className='flex flex-col h-full'>
          {/* Header bar */}
          <div
            ref={headerRef}
            role='button'
            tabIndex={0}
            onClick={() => isFullscreen ? toggleFullscreen() : close()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { if (isFullscreen) toggleFullscreen(); else close() } }}
            className='shrink-0 flex items-center px-3 gap-2 h-9 border-b border-zinc-700 cursor-pointer hover:bg-zinc-800/50 transition-colors'
            style={{ opacity: 0 }}
          >
            <div className='flex items-center gap-1 ml-1' onClick={e => e.stopPropagation()}>
              <MagnifyingGlassIcon className='w-3.5 h-3.5 text-zinc-500 shrink-0' />
              <input
                type='search'
                placeholder='Find…'
                value={findText}
                onChange={e => handleFindChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); nav(e.shiftKey ? 'prev' : 'next') } }}
                className='bg-zinc-950 border border-white/20 rounded px-1.5 py-0.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36'
              />
              {findText && (
                <>
                  <span className='text-xs text-zinc-500 shrink-0'>{matchCount}</span>
                  <button onClick={() => nav('prev')} disabled={!matchCount} className='rounded p-1 text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors'>
                    <ChevronLeftIcon className='w-3.5 h-3.5' />
                  </button>
                  <button onClick={() => nav('next')} disabled={!matchCount} className='rounded p-1 text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors'>
                    <ChevronRightIcon className='w-3.5 h-3.5' />
                  </button>
                </>
              )}
            </div>
            <div className='flex-1' />
            <div className='flex items-center gap-0.5' onClick={e => e.stopPropagation()}>
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Restore' : 'Expand to fullscreen'}
                className='rounded p-1 text-zinc-500 hover:text-white hover:bg-white/10 transition-colors'
              >
                <ChevronUpIcon className={`w-4 h-4 transition-transform duration-200 ${isFullscreen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className='flex flex-col flex-1 min-h-0 overflow-hidden'>
            <CodeMirror
              ref={editorRef}
              value={datasetsJson}
              onChange={onDatasetsJsonChange}
              extensions={[json(), search(), oneDark, matchHighlight]}
              theme='none'
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
                bracketMatching: true,
                autocompletion: true,
                searchKeymap: false,
              }}
              className='flex-1 min-h-0 overflow-auto text-xs [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto'
              style={{ height: '100%' }}
            />
            {datasetsError && (
              <p className='shrink-0 text-red-400 text-xs px-2 py-1 bg-red-950/40'>
                {datasetsError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

