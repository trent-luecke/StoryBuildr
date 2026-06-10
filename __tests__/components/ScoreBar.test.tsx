// __tests__/components/ScoreBar.test.tsx
import { render } from '@testing-library/react'
import { ScoreBar } from '@/components/audit/ScoreBar'

test('renders score text', () => {
  const { getByText } = render(<ScoreBar score={7} />)
  expect(getByText('7')).toBeInTheDocument()
  expect(getByText('/10')).toBeInTheDocument()
})

test('uses accent color for score >= 6', () => {
  const { container } = render(<ScoreBar score={6} />)
  const bar = container.querySelector('[data-testid="score-bar-fill"]')
  expect(bar).toHaveClass('bg-[#81A1D3]')
})

test('uses red color for score < 6', () => {
  const { container } = render(<ScoreBar score={4} />)
  const bar = container.querySelector('[data-testid="score-bar-fill"]')
  expect(bar).toHaveClass('bg-[#f87171]')
})

test('renders null score as self-reported badge', () => {
  const { getByText } = render(<ScoreBar score={null} />)
  expect(getByText('Self-reported')).toBeInTheDocument()
})
