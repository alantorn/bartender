'use client'

import { Input, InputGroup } from '@/components/input'
import { MagnifyingGlassIcon } from '@heroicons/react/16/solid'

import { useRef } from 'react'
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
}

export default function AppSidebar({
  file,
  onFile,
  inspecting,
  canGenerate,
  loading,
  onGenerate,
  onConfigOpen,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <Sidebar>
      <SidebarHeader>
        <Dropdown></Dropdown>
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

      <SidebarBody>
        {file && (
          <>
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
                  placeholder='Search&hellip;'
                  aria-label='Search'
                />
              </InputGroup>

              <SidebarItem href='/events/3'>Six Fingers — DJ Set</SidebarItem>
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
            Serve me some charts
          </button>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
