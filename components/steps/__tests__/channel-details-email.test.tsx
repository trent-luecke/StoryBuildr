import { render, screen, fireEvent } from '@testing-library/react'
import { WizardProvider } from '@/hooks/useWizard'
import { StepChannelDetails } from '@/components/steps/StepChannelDetails'
import { WizardState } from '@/lib/types'

const seed: Partial<WizardState> = {
  channelIntroSeen: true,
  businessInfo: { gymName: 'Test Gym', services: ['Open Gym'], icp: 'x', channels: ['email'] },
  channelDetails: {},
  preflightResults: {},
}

function renderStep() {
  return render(
    <WizardProvider initialState={seed}>
      <StepChannelDetails />
    </WizardProvider>
  )
}

describe('Channel Details email gating UI', () => {
  it('hides the platform dropdown until "Yes" is chosen', () => {
    renderStep()
    expect(screen.queryByText('Select platform')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByText('Select platform')).toBeInTheDocument()
  })

  it('shows the "Other" free-text input when platform is Other', () => {
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    const select = screen.getByText('Select platform').closest('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Other' } })
    expect(screen.getByPlaceholderText('Which platform?')).toBeInTheDocument()
  })

  it('offers HubSpot and GoHighLevel as options', () => {
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByText('HubSpot')).toBeInTheDocument()
    expect(screen.getByText('GoHighLevel')).toBeInTheDocument()
  })

  it('hides the dropdown again when switching to "No"', () => {
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByText('Select platform')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.queryByText('Select platform')).toBeNull()
  })

  it('blocks proceeding and shows an error when the gating question is unanswered', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /Begin Audit/i }))
    expect(screen.getByText('Let us know so we can tailor your email plan.')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
    jest.resetAllMocks()
  })

  it('proceeds without any preflight call once gating is answered (email-only, no website)', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    fireEvent.click(screen.getByRole('button', { name: /Begin Audit/i }))
    // no website ⇒ no /api/preflight call
    expect(global.fetch).not.toHaveBeenCalled()
    jest.resetAllMocks()
  })
})
