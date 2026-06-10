'use client'

import { WizardProvider, useWizard } from '@/hooks/useWizard'
import { WizardSidebar } from './WizardSidebar'
import { StepWelcome } from '@/components/steps/StepWelcome'
import { StepBusinessInfo } from '@/components/steps/StepBusinessInfo'
import { StepChannelDetails } from '@/components/steps/StepChannelDetails'
import { StepAuditLoading } from '@/components/steps/StepAuditLoading'
import { StepAuditResults } from '@/components/steps/StepAuditResults'
import { StepStoryMine } from '@/components/steps/StepStoryMine'
import { StepYourPlan } from '@/components/steps/StepYourPlan'

function WizardContent() {
  const { state } = useWizard()

  const steps = {
    1: <StepWelcome />,
    2: <StepBusinessInfo />,
    3: <StepChannelDetails />,
    4: <StepAuditLoading />,
    5: <StepAuditResults />,
    6: <StepStoryMine />,
    7: <StepYourPlan />,
  }

  return (
    <div className="min-h-screen flex">
      <WizardSidebar currentStep={state.currentStep} />
      <main className="flex-1 bg-white overflow-auto">
        {steps[state.currentStep]}
      </main>
    </div>
  )
}

export function WizardLayout() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  )
}
