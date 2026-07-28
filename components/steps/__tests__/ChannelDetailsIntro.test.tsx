import { render, screen, fireEvent } from '@testing-library/react'
import { ChannelDetailsIntro } from '@/components/steps/ChannelDetailsIntro'

it('renders the lead-in heading and value props', () => {
  render(<ChannelDetailsIntro onContinue={() => {}} onBack={() => {}} />)
  expect(screen.getByText(/the part that does the heavy lifting/i)).toBeInTheDocument()
  expect(screen.getByText('Real examples beat guesses')).toBeInTheDocument()
  expect(screen.getByText('About 2–3 minutes')).toBeInTheDocument()
  expect(screen.getByText('No wrong answers')).toBeInTheDocument()
})

it('fires onContinue and onBack', () => {
  const onContinue = jest.fn()
  const onBack = jest.fn()
  render(<ChannelDetailsIntro onContinue={onContinue} onBack={onBack} />)
  fireEvent.click(screen.getByRole('button', { name: /Let's do it/i }))
  fireEvent.click(screen.getByRole('button', { name: /Back/i }))
  expect(onContinue).toHaveBeenCalledTimes(1)
  expect(onBack).toHaveBeenCalledTimes(1)
})
