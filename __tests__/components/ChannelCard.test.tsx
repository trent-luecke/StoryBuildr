// __tests__/components/ChannelCard.test.tsx
import { render, screen } from '@testing-library/react'
import { ChannelCard } from '@/components/audit/ChannelCard'
import { AuditResult } from '@/lib/types'

const mockResult: AuditResult = {
  channel: 'instagram',
  score: 4,
  narrative: 'You post consistently but content is 100% promotional.',
  doingWell: ['Posts 3x/week', 'Good use of Reels'],
  opportunities: ['No member stories', 'No behind-the-scenes content'],
  selfReported: false,
}

test('renders channel name', () => {
  render(<ChannelCard result={mockResult} />)
  expect(screen.getByText('instagram')).toBeInTheDocument()
})

test('renders narrative text', () => {
  render(<ChannelCard result={mockResult} />)
  expect(screen.getByText(mockResult.narrative)).toBeInTheDocument()
})

test('renders all doingWell items', () => {
  render(<ChannelCard result={mockResult} />)
  expect(screen.getByText('Posts 3x/week')).toBeInTheDocument()
  expect(screen.getByText('Good use of Reels')).toBeInTheDocument()
})

test('renders all opportunity items', () => {
  render(<ChannelCard result={mockResult} />)
  expect(screen.getByText('No member stories')).toBeInTheDocument()
})
