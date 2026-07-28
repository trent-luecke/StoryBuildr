import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WizardProvider, useWizard } from '@/hooks/useWizard'
import { StepChannelDetails } from '@/components/steps/StepChannelDetails'
import { WizardState, Channel } from '@/lib/types'

function renderStep(seed: Partial<WizardState>) {
  const probe = { step: 0 as number }
  function Probe() {
    const { state } = useWizard()
    probe.step = state.currentStep
    return null
  }
  render(
    <WizardProvider previewMode initialState={seed}>
      <StepChannelDetails />
      <Probe />
    </WizardProvider>
  )
  return probe
}

function baseSeed(channels: Channel[], extra: Partial<WizardState> = {}): Partial<WizardState> {
  return {
    currentStep: 3,
    channelIntroSeen: true,
    businessInfo: { gymName: 'Test', services: ['Open Gym'], icp: 'x', channels },
    ...extra,
  }
}

it('shows the lead-in first when the intro has not been seen', () => {
  renderStep({ ...baseSeed(['instagram']), channelIntroSeen: false })
  expect(screen.getByText(/the part that does the heavy lifting/i)).toBeInTheDocument()
})

it('skips the lead-in on return (intro already seen) and shows the first channel', () => {
  renderStep(baseSeed(['instagram', 'website']))
  expect(screen.queryByText(/the part that does the heavy lifting/i)).toBeNull()
  expect(screen.getByRole('heading', { name: 'Your Instagram' })).toBeInTheDocument()
  expect(screen.getByText('Channel 1 of 2')).toBeInTheDocument()
})

it('only renders screens for selected channels — no email screen when email is not selected', () => {
  renderStep(baseSeed(['instagram']))
  // advance past the single Instagram screen → Begin Audit, no email screen ever shown
  expect(screen.getByRole('button', { name: /Begin Audit/i })).toBeInTheDocument()
  expect(screen.queryByText('Your email list')).toBeNull()
})

it('advances linearly and the last screen begins the audit', () => {
  const probe = renderStep(baseSeed(['instagram']))
  fireEvent.click(screen.getByRole('button', { name: /Begin Audit/i }))
  expect(probe.step).toBe(4)
})

it('walks instagram → website → begin audit, dispatching website details', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ json: async () => ({ website: { status: 'pass' } }) })) as unknown as typeof fetch
  const probe = renderStep(baseSeed(['instagram', 'website']))
  // Instagram screen (1 of 2) → Continue
  fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
  // Website screen (2 of 2)
  fireEvent.change(screen.getByPlaceholderText('https://yourgym.com'), { target: { value: 'https://g.com' } })
  fireEvent.click(screen.getByRole('button', { name: /Begin Audit/i }))
  // preflight resolves (two microtask hops: await fetch, await res.json()) → finalize → step 4
  await waitFor(() => expect(probe.step).toBe(4))
  jest.resetAllMocks()
})

it('Back from the first channel returns to Business Info (step 2) on a return visit', () => {
  const probe = renderStep(baseSeed(['instagram']))
  fireEvent.click(screen.getByRole('button', { name: /← Back/i }))
  expect(probe.step).toBe(2)
})
