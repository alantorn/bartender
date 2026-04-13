'use client'

import { useState } from 'react'
import { SidebarLayout }    from '@/components/sidebar-layout'
import AppSidebar           from '@/components/AppSidebar'
import LandingZone          from '@/components/LandingZone'
import ConfigPanel          from '@/components/ConfigPanel'
import Preview              from '@/components/Preview'
import ChartStylePanel      from '@/components/ChartStylePanel'
import { useStudio }        from '@/app/hooks/useStudio'

export default function StudioPage() {
  const [stylePanelOpen, setStylePanelOpen] = useState(false)
  const {
    uploadedFile,
    downloadRef,
    sidebarProps,
    toolbarProps,
    previewProps,
    configPanelProps,
  } = useStudio()

  if (!uploadedFile) {
    return (
      <LandingZone
        onFile={sidebarProps.onFile}
        inspecting={sidebarProps.inspecting}
        error={sidebarProps.inspectError}
      />
    )
  }

  return (
    <SidebarLayout
      sidebar={<AppSidebar
        file={uploadedFile}
        onFile={sidebarProps.onFile}
        inspecting={sidebarProps.inspecting}
        canGenerate={toolbarProps.canGenerate}
        loading={toolbarProps.loading}
        onGenerate={toolbarProps.onGenerate}
        onConfigOpen={() => setStylePanelOpen(v => !v)}
      />}
      secondSidebar={stylePanelOpen ? (
        <ChartStylePanel
          config={sidebarProps.config}
          onChange={sidebarProps.onChange}
          onClose={() => setStylePanelOpen(false)}
        />
      ) : undefined}
      navbar={<span className="text-sm font-medium text-white">Bartender</span>}
    >
      {/* ── Studio ───────────────────────────────────────────────── */}
      <div className="flex flex-col h-full min-h-0">
        {/* Main canvas */}
        <div className="flex-1 overflow-y-auto p-6">
          <Preview {...previewProps} />
        </div>

        {/* JSON config drawer — pinned to bottom */}
        <ConfigPanel {...configPanelProps} />
      </div>

      {/* Hidden anchor for programmatic download */}
      <a ref={downloadRef} className="hidden" aria-hidden="true" />
    </SidebarLayout>
  )
}

