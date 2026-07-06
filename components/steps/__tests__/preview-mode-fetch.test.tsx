import { render, screen } from '@testing-library/react'
import { WizardProvider } from '@/hooks/useWizard'
import { StepAuditLoading } from '@/components/steps/StepAuditLoading'
import { StepYourPlan } from '@/components/steps/StepYourPlan'
import { WizardState } from '@/lib/types'

const baseSeed: Partial<WizardState> = {
  businessInfo: { gymName: 'Test Gym', services: ['Open Gym'], icp: 'x', channels: ['instagram'] },
  channelDetails: { instagram: { url: 'https://instagram.com/test' } },
  preflightResults: { instagram: { status: 'pass' } },
  auditResults: [],
  storyMineAnswers: {},
}

describe('previewMode suppresses network calls', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch
  })
  afterEach(() => jest.resetAllMocks())

  it('StepAuditLoading does not fetch in preview mode', () => {
    render(
      <WizardProvider previewMode initialState={baseSeed}>
        <StepAuditLoading />
      </WizardProvider>
    )
    expect(global.fetch).not.toHaveBeenCalled()
    // spinner text still renders
    expect(screen.getByText(/This usually takes/i)).toBeInTheDocument()
  })

  it('StepYourPlan does not fetch in preview mode when no storyPlan', () => {
    render(
      <WizardProvider previewMode initialState={baseSeed}>
        <StepYourPlan />
      </WizardProvider>
    )
    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getByText(/Building your 30-day content plan/i)).toBeInTheDocument()
  })

  it('StepAuditLoading DOES fetch when previewMode is off', () => {
    render(
      <WizardProvider initialState={baseSeed}>
        <StepAuditLoading />
      </WizardProvider>
    )
    expect(global.fetch).toHaveBeenCalledWith('/api/audit', expect.anything())
  })
})
