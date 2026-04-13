'use client'

import { Input, InputGroup } from '@/components/input'
import { MagnifyingGlassIcon } from '@heroicons/react/16/solid'

import { useRef, useState } from 'react'
import { Dropdown } from '@/components/dropdown'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from '@/components/sidebar'
import {
  ArrowPathIcon,
  BoltIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/20/solid'

interface Props {
  file: File | null
  onFile: (f: File) => void
  inspecting: boolean
  canGenerate: boolean
  loading: boolean
  onGenerate: () => void
  onConfigOpen: () => void
  cards?: { id: string; label: string }[]
}

export default function AppSidebar({
  file,
  onFile,
  inspecting,
  canGenerate,
  loading,
  onGenerate,
  onConfigOpen,
  cards = [],
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const filteredCards = cards.filter(c => c.label.toLowerCase().includes(search.toLowerCase()))
  return (
    <Sidebar>
      <SidebarHeader>
        
        {/* Logo */}
        <div className='flex items-center gap-2.5 px-2 py-3  mb-10'>
          <img src='/bartender-logo.svg' alt='Bartender' className='w-8 h-12' />
          <span className='text-3xl font-semibold text-white tracking-tight'>Bartender</span>
        </div>
        <SidebarSection className='max-lg:hidden'>
          {/* Document picker */}
          <SidebarItem
            className='bg-black rounded-md'
            onClick={() => inputRef.current?.click()}
            title={file?.name}
          >
            {inspecting ? (
              <ArrowPathIcon className='animate-spin' />
            ) : file ? (
              <span className='flex items-center'>
                <CheckCircleIcon className='size-5 text-green-400 fill-green-400' />
              </span>
            ) : (
              <DocumentArrowUpIcon />
            )}
            <SidebarLabel className={file ? 'text-indigo-400' : ''}>
              {file ? file.name : 'Open document…'}
            </SidebarLabel>
          </SidebarItem>
          <input
            ref={inputRef}
            type='file'
            accept='.csv,.xlsx'
            className='hidden'
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
            }}
          />
        </SidebarSection>
      </SidebarHeader>

      <SidebarBody className='!pt-0'>
        {file && (
          <>
            <div className='sticky top-0 z-10 bg-zinc-900 -mx-4 px-4 pt-4 pb-2 shadow-[0_4px_8px_4px_#18181b]'>
              <SidebarSection>
                <SidebarItem onClick={onConfigOpen}>
                  <Cog6ToothIcon />
                  <SidebarLabel>Configure charts</SidebarLabel>
                </SidebarItem>
              </SidebarSection>
              <SidebarSection className='max-lg:hidden'>
                <SidebarHeading>Generated charts</SidebarHeading>
                <InputGroup>
                  <MagnifyingGlassIcon />
                  <Input
                    name='search'
                    placeholder='Search…'
                    aria-label='Search'
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </InputGroup>
              </SidebarSection>
            </div>
            <SidebarSection className='max-lg:hidden'>
              {cards.length > 0 ? (
                filteredCards.length > 0 ? (
                  filteredCards.map(card => (
                    <SidebarItem
                      key={card.id}
                      href='#'
                      onClick={e => {
                        e.preventDefault()
                        document.getElementById(`card-${card.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                    >
                      {card.label}
                    </SidebarItem>
                  ))
                ) : (
                  <p className='text-xs text-zinc-500 px-2 py-1'>No matches</p>
                )
              ) : null}
            </SidebarSection>
          </>
        )}
        <SidebarSpacer />
      </SidebarBody>

      {file && (
        <SidebarFooter>
          <button
            type='button'
            onClick={onGenerate}
            disabled={!canGenerate || loading}
            className='w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors
            bg-indigo-600 text-white hover:bg-indigo-500
            disabled:opacity-40 disabled:cursor-not-allowed'
          >
            {loading ? (
              <ArrowPathIcon className='size-4 animate-spin' />
            ) : (
              <BoltIcon className='size-4' />
            )}
            Serve me
          </button>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
