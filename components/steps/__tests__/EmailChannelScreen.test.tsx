import { render, screen, fireEvent } from '@testing-library/react'
import { EmailChannelScreen } from '@/components/steps/EmailChannelScreen'

it('renders progress and the gating question', () => {
  render(<EmailChannelScreen current={1} total={1} isLast onBack={() => {}} onContinue={() => {}} />)
  expect(screen.getByText('Channel 1 of 1')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument()
})

it('blocks Continue with an error until the gating question is answered', () => {
  const onContinue = jest.fn()
  render(<EmailChannelScreen current={1} total={1} isLast onBack={() => {}} onContinue={onContinue} />)
  fireEvent.click(screen.getByRole('button', { name: /Begin Audit/i }))
  expect(screen.getByText('Let us know so we can tailor your email plan.')).toBeInTheDocument()
  expect(onContinue).not.toHaveBeenCalled()
})

it('shows the platform dropdown only after choosing Yes', () => {
  render(<EmailChannelScreen current={1} total={1} isLast onBack={() => {}} onContinue={() => {}} />)
  expect(screen.queryByText('Select platform')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
  expect(screen.getByText('Select platform')).toBeInTheDocument()
})

it('submits the email data once gating is answered', () => {
  const onContinue = jest.fn()
  render(<EmailChannelScreen current={1} total={1} isLast onBack={() => {}} onContinue={onContinue} />)
  fireEvent.click(screen.getByRole('button', { name: 'No' }))
  fireEvent.change(screen.getByPlaceholderText('e.g. 340'), { target: { value: '340' } })
  fireEvent.click(screen.getByRole('button', { name: /Begin Audit/i }))
  expect(onContinue).toHaveBeenCalledWith(
    expect.objectContaining({ usesPlatform: false, subscriberCount: 340 })
  )
})
