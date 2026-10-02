import { act, fireEvent, render, screen } from '@testing-library/react'
import { WizardProvider } from '@/hooks/useWizard'
import { StepYourPlan } from '@/components/steps/StepYourPlan'
import { HAPPY_PATH } from '@/lib/preview/mock-data'
import { NEXT_STEP_DOWNLOAD_DELAY_MS, NEXT_STEP_FALLBACK_MS } from '@/lib/next-step'
import { WizardState } from '@/lib/types'

const seed: Partial<WizardState> = { ...HAPPY_PATH, nextStepModal: 'unseen' }
const HEADLINE = /how do you get these prospects in the door/i

function renderPlan(previewMode = false) {
  return render(
    <WizardProvider initialState={seed} previewMode={previewMode}>
      <StepYourPlan />
    </WizardProvider>
  )
}

function mockPdf(ok: boolean) {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok, status: ok ? 200 : 500, blob: () => Promise.resolve(new Blob(['%PDF'])) })
  ) as unknown as typeof fetch
}

async function clickDownload() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /download your full report/i }))
  })
}

beforeEach(() => {
  jest.useFakeTimers()
  URL.createObjectURL = jest.fn(() => 'blob:x')
  URL.revokeObjectURL = jest.fn()
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

it('opens the modal after a successful download, following the delay', async () => {
  mockPdf(true)
  renderPlan()
  await clickDownload()
  act(() => { jest.advanceTimersByTime(NEXT_STEP_DOWNLOAD_DELAY_MS - 1) })
  expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument()
  act(() => { jest.advanceTimersByTime(1) })
  expect(screen.getByText(HEADLINE)).toBeInTheDocument()
})

it('opens the modal via fallback when the user never clicks download', () => {
  renderPlan()
  act(() => { jest.advanceTimersByTime(NEXT_STEP_FALLBACK_MS - 1) })
  expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument()
  act(() => { jest.advanceTimersByTime(1) })
  expect(screen.getByText(HEADLINE)).toBeInTheDocument()
})

it('clicking download cancels the fallback timer', async () => {
  global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch // PDF never resolves
  renderPlan()
  await clickDownload()
  act(() => { jest.advanceTimersByTime(NEXT_STEP_FALLBACK_MS * 2) })
  expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument()
})

it('on PDF failure: shows the error, no modal, and restarts the fallback timer', async () => {
  mockPdf(false)
  renderPlan()
  act(() => { jest.advanceTimersByTime(NEXT_STEP_FALLBACK_MS - 1000) })
  await clickDownload()
  expect(screen.getByRole('alert')).toHaveTextContent(
    'There was an issue generating your PDF. Please try clicking download again.'
  )
  act(() => { jest.advanceTimersByTime(NEXT_STEP_DOWNLOAD_DELAY_MS) })
  expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument()
  // Restarted, not resumed: a full fallback window must pass after the failure
  // (2s already elapsed above — a resumed timer would have fired at 1s)
  act(() => { jest.advanceTimersByTime(NEXT_STEP_FALLBACK_MS - NEXT_STEP_DOWNLOAD_DELAY_MS - 1) })
  expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument()
  act(() => { jest.advanceTimersByTime(1) })
  expect(screen.getByText(HEADLINE)).toBeInTheDocument()
})

it('closing via the X shows the banner, and the modal never reopens', async () => {
  mockPdf(true)
  renderPlan()
  act(() => { jest.advanceTimersByTime(NEXT_STEP_FALLBACK_MS) })
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  act(() => { jest.advanceTimersByTime(1000) }) // let close animation settle
  expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument()
  expect(screen.getByText(/next: get these prospects in the door/i)).toBeInTheDocument()

  await clickDownload()
  act(() => { jest.advanceTimersByTime(NEXT_STEP_FALLBACK_MS * 2) })
  expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument()
})

it('preview mode: fallback timer is off', () => {
  renderPlan(true)
  act(() => { jest.advanceTimersByTime(NEXT_STEP_FALLBACK_MS * 2) })
  expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument()
})

it('preview mode: download trigger still opens the modal', async () => {
  mockPdf(true)
  renderPlan(true)
  await clickDownload()
  act(() => { jest.advanceTimersByTime(NEXT_STEP_DOWNLOAD_DELAY_MS) })
  expect(screen.getByText(HEADLINE)).toBeInTheDocument()
})
