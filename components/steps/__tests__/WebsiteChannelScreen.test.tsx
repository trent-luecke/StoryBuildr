import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WebsiteChannelScreen } from '@/components/steps/WebsiteChannelScreen'

function fetchOnce(status: string) {
  global.fetch = jest.fn(() =>
    Promise.resolve({ json: async () => ({ website: { status } }) })
  ) as unknown as typeof fetch
}

afterEach(() => jest.resetAllMocks())

it('renders the website URL field and progress', () => {
  render(<WebsiteChannelScreen current={1} total={2} isLast={false} onBack={() => {}} onContinue={() => {}} />)
  expect(screen.getByText('Channel 1 of 2')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('https://yourgym.com')).toBeInTheDocument()
})

it('advances with status pass when the preflight passes', async () => {
  fetchOnce('pass')
  const onContinue = jest.fn()
  render(<WebsiteChannelScreen current={1} total={2} isLast={false} onBack={() => {}} onContinue={onContinue} />)
  fireEvent.change(screen.getByPlaceholderText('https://yourgym.com'), { target: { value: 'https://g.com' } })
  fireEvent.click(screen.getByRole('button', { name: /Check & continue/i }))
  await waitFor(() => expect(onContinue).toHaveBeenCalledWith({ url: 'https://g.com', status: 'pass' }))
})

it('offers skip on unreachable, and skipping advances with status skipped', async () => {
  fetchOnce('unreachable')
  const onContinue = jest.fn()
  render(<WebsiteChannelScreen current={1} total={2} isLast={false} onBack={() => {}} onContinue={onContinue} />)
  fireEvent.change(screen.getByPlaceholderText('https://yourgym.com'), { target: { value: 'https://bad.com' } })
  fireEvent.click(screen.getByRole('button', { name: /Check & continue/i }))
  const skip = await screen.findByRole('button', { name: /Skip this channel/i })
  expect(onContinue).not.toHaveBeenCalled()
  fireEvent.click(skip)
  expect(onContinue).toHaveBeenCalledWith({ url: 'https://bad.com', status: 'skipped' })
})

it('last screen shows the Begin Audit label', () => {
  render(<WebsiteChannelScreen current={2} total={2} isLast onBack={() => {}} onContinue={() => {}} />)
  expect(screen.getByRole('button', { name: /Begin Audit/i })).toBeInTheDocument()
})

it('recovers to the skip affordance when the preflight request fails', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('network'))) as unknown as typeof fetch
  const onContinue = jest.fn()
  render(<WebsiteChannelScreen current={1} total={2} isLast={false} onBack={() => {}} onContinue={onContinue} />)
  fireEvent.change(screen.getByPlaceholderText('https://yourgym.com'), { target: { value: 'https://g.com' } })
  fireEvent.click(screen.getByRole('button', { name: /Check & continue/i }))
  // does not hang in "Checking…"; shows the recovery affordance
  const skip = await screen.findByRole('button', { name: /Skip this channel/i })
  expect(onContinue).not.toHaveBeenCalled()
  // primary button is re-enabled (not stuck disabled on "Checking…")
  expect(screen.getByRole('button', { name: /Check & continue/i })).not.toBeDisabled()
  fireEvent.click(skip)
  expect(onContinue).toHaveBeenCalledWith({ url: 'https://g.com', status: 'skipped' })
})
