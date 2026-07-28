import { render, screen } from '@testing-library/react'
import { ChannelProgress } from '@/components/ui/ChannelProgress'

it('renders the current/total label', () => {
  render(<ChannelProgress current={2} total={4} />)
  expect(screen.getByText('Channel 2 of 4')).toBeInTheDocument()
})

it('fills the bar proportionally', () => {
  const { container } = render(<ChannelProgress current={2} total={4} />)
  const fill = container.querySelector('[data-progress-fill]') as HTMLElement
  expect(fill).toHaveStyle({ width: '50%' })
})
