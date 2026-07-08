'use client'

import { useState } from 'react'
import { WizardProvider } from '@/hooks/useWizard'
import { WizardContent } from '@/components/wizard/WizardLayout'
import { PreviewToolbar } from './PreviewToolbar'
import { PREVIEW_VIEWS } from '@/lib/preview/mock-data'

export function PreviewHarness() {
  const [activeId, setActiveId] = useState(PREVIEW_VIEWS[0].id)
  const view = PREVIEW_VIEWS.find((v) => v.id === activeId) ?? PREVIEW_VIEWS[0]

  return (
    <div className="min-h-screen flex flex-col">
      <PreviewToolbar activeId={activeId} onSelect={setActiveId} />
      <div className="flex-1">
        <WizardProvider key={activeId} initialState={view.seed} previewMode>
          <WizardContent />
        </WizardProvider>
      </div>
    </div>
  )
}
