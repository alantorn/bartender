'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { FileValidationIcon } from '@hugeicons/core-free-icons'

import { useRef, useState } from 'react'

interface Props {
  datasetId: string
  datasetLabel: string
  onFile: (id: string, file: File) => void
  current?: File | null
}

export default function FileDropZone({ datasetId, onFile, current }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    onFile(datasetId, file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (


    

    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`
         border rounded-lg px-4 py-5 cursor-pointer transition-colors text-sm
        ${
          dragging
            ? 'border-blue-400 bg-blue-50'
            : current
              ? 'border-green-400 bg-zinc-800 text-green-700'
              : 'border-neutral-300 hover:border-neutral-400 text-neutral-500'
        }
      `}
    >

                 <HugeiconsIcon
            icon={FileValidationIcon}
            size={16}
            color='currentColor'
            strokeWidth={1.5}
          />


      <input
        ref={inputRef}
        type='file'
        accept='.csv,.xlsx'
        className='hidden'
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />

      {current ? (
        <span className='truncate block max-w-full'> {current.name}</span>
      ) : (
        <span>Drop .xlsx / .csv or click to browse</span>
      )}
    </div>
  )
}
