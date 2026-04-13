'use client'

import { SidebarLayout }  from '@/components/sidebar-layout'
import AppSidebar         from '@/components/AppSidebar'
import LandingZone        from '@/components/LandingZone'
import ConfigPanel        from '@/components/ConfigPanel'
import { useStudio }      from '@/app/hooks/useStudio'

export default function StudioPage() {
  const {
    uploadedFile,
    downloadRef,
    sidebarProps,
    toolbarProps,
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
      />}
      navbar={<span className="text-sm font-medium text-white">Bartender</span>}
    >
      {/* ── Studio ───────────────────────────────────────────────── */}
      <div className="flex flex-col h-full min-h-0">
        {/* Main canvas — Preview will live here */}
        <div className="flex-1 overflow-y-auto p-6 text-zinc-500 text-sm">
          Ready. Toolbar and Preview go here.
        </div>

        {/* JSON config drawer — pinned to bottom */}
        <ConfigPanel {...configPanelProps} />
      </div>

      {/* Hidden anchor for programmatic download */}
      <a ref={downloadRef} className="hidden" aria-hidden="true" />
    </SidebarLayout>
  )
}

