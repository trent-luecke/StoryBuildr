import { render, screen, fireEvent } from '@testing-library/react'
import { WizardProvider } from '@/hooks/useWizard'
import { StepChannelDetails } from '@/components/steps/StepChannelDetails'
import { WizardState } from '@/lib/types'

const seed: Partial<WizardState> = {
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
})
