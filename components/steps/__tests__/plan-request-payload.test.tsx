import { render } from '@testing-library/react'
import { WizardProvider } from '@/hooks/useWizard'
import { StepYourPlan } from '@/components/steps/StepYourPlan'
import { WizardState } from '@/lib/types'

const seed: Partial<WizardState> = {
  businessInfo: { gymName: 'Test Gym', services: ['Open Gym'], icp: 'x', channels: ['email'] },
  channelDetails: { email: { usesPlatform: true, platform: 'Mailchimp', subscriberCount: 340, sendFrequency: 'Weekly' } },
  preflightResults: { email: { status: 'pass' } },
  auditResults: [],
  storyMineAnswers: {},
}

describe('plan request payload', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch
  })
  afterEach(() => jest.resetAllMocks())

  it('sends channelDetails to /api/generate', () => {
    render(
      <WizardProvider initialState={seed}>
        <StepYourPlan />
      </WizardProvider>
    )
    const call = (global.fetch as jest.Mock).mock.calls.find((c) => c[0] === '/api/generate')
    expect(call).toBeDefined()
    const body = JSON.parse(call![1].body)
    expect(body.channelDetails.email.usesPlatform).toBe(true)
  })
})
