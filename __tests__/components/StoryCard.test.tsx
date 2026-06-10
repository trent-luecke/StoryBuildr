// __tests__/components/StoryCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryCard } from '@/components/plan/StoryCard'
import { Story } from '@/lib/types'

const mockStory: Story = {
  title: 'Sarah Lost 22 lbs in 90 Days',
  type: 'Member Transformation',
  whySelected: 'Transformation stories are the highest-converting content for gym audiences.',
  channels: {
    instagram: {
      copy: '90 days ago, Sarah walked in nervous…',
      visualRecommendation: 'Before/after photo',
      suggestedPostDate: 'Week 1, Wednesday',
    },
  },
}

test('renders story title', () => {
  render(<StoryCard story={mockStory} activeChannels={['instagram']} defaultExpanded={false} index={0} />)
  expect(screen.getByText('Sarah Lost 22 lbs in 90 Days')).toBeInTheDocument()
})

test('is collapsed by default when defaultExpanded is false', () => {
  render(<StoryCard story={mockStory} activeChannels={['instagram']} defaultExpanded={false} index={0} />)
  expect(screen.queryByText(mockStory.whySelected)).not.toBeInTheDocument()
})

test('expands on click to show whySelected', async () => {
  render(<StoryCard story={mockStory} activeChannels={['instagram']} defaultExpanded={false} index={0} />)
  await userEvent.click(screen.getByText('Sarah Lost 22 lbs in 90 Days'))
  expect(screen.getByText(mockStory.whySelected)).toBeInTheDocument()
})

test('renders expanded by default when defaultExpanded is true', () => {
  render(<StoryCard story={mockStory} activeChannels={['instagram']} defaultExpanded={true} index={0} />)
  expect(screen.getByText(mockStory.whySelected)).toBeInTheDocument()
})
